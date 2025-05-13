import os
import yaml
from common.models import db, EndpointGroup, Endpoint, Page, EndpointRule, Role, RolePage, RoleEndpointRule, PageEndpointRule
from common.util import helper
from common.extensions import clear_table

def generate_full_rbac():
    #clear_rbac()
    generate_endpoints_structure()
    generate_page_endpoints_structure()
    load_all_roles()
    generate_role_endpoint_rules()

def clear_rbac():
    clear_table(EndpointGroup)
    clear_table(Endpoint)
    clear_table(PageEndpointRule)
    clear_table(RoleEndpointRule)
    clear_table(RolePage)
    clear_table(EndpointRule)
    clear_table(Page)

def generate_endpoints_structure():
    script_dir = os.path.dirname(__file__)
    jams_root = os.path.abspath(os.path.join(script_dir, '..', '..'))  # goes to jams/
    endpoints_yaml_path = os.path.join(jams_root, 'default_config', 'endpoints.yaml')
    data = load_yaml(endpoints_yaml_path)
    groups = data.get('groups', {})

    if groups:
        for group_name, group_data in groups.items():
            group_description = group_data.get('description', [])

            group = EndpointGroup.query.filter_by(name=group_name).first()
            if not group:
                group = EndpointGroup(name=group_name, description=group_description)
                db.session.add(group)
            else:
                group.description = group_description
            
            db.session.commit()

            # Get the read endpoints
            read_endpoints = group_data.get('read', [])
            if read_endpoints:
                for endpoint_name, endpoint_data in read_endpoints.items():
                    endpoint = Endpoint.query.filter_by(name=endpoint_name).first()
                    if not endpoint:
                        endpoint = Endpoint(name=endpoint_name, endpoint=endpoint_data, endpoint_group_id=group.id, read=True, write=False)
                        db.session.add(endpoint)
                    else:
                        endpoint.endpoint = endpoint_data
                        endpoint.endpoint_group_id = group.id
                        endpoint.read = True
                        endpoint.write=False
                    
                    db.session.commit()
            
            # Get the write endpoints
            write_endpoints = group_data.get('write', [])
            if write_endpoints:
                for endpoint_name, endpoint_data in write_endpoints.items():
                    endpoint = Endpoint.query.filter_by(name=endpoint_name).first()
                    if not endpoint:
                        endpoint = Endpoint(name=endpoint_name, endpoint=endpoint_data, endpoint_group_id=group.id, read=False, write=True)
                        db.session.add(endpoint)
                    else:
                        endpoint.endpoint = endpoint_data
                        endpoint.endpoint_group_id = group.id
                        endpoint.read = False
                        endpoint.write=True
                    
                    db.session.commit()


def generate_page_endpoints_structure():
    script_dir = os.path.dirname(__file__)
    jams_root = os.path.abspath(os.path.join(script_dir, '..', '..'))  # goes to jams/
    pages_yaml_path = os.path.join(jams_root, 'default_config', 'pages.yaml')
    data = load_yaml(pages_yaml_path)
    pages = data.get('pages', {})

    if pages:
        # Get the first key-value pair from the pages dictionary
        for page_name, page_data in pages.items():
            page_endpoint = page_data.get('endpoint', [])
            page_is_default = page_data.get('default', [])
            page_is_public = page_data.get('public', [])
            if page_endpoint == []:
                page_endpoint = None
            if not page_is_default:
                page_is_default = False
            if not page_is_public:
                page_is_public = False
            page = Page.query.filter_by(name=page_name).first()
            if not page:
                page = Page(name=page_name, endpoint=page_endpoint, default=page_is_default, public=page_is_public)
                db.session.add(page)
            else:
                page.endpoint = page_endpoint
                page.default = page_is_default
                page.public = page_is_public
            
            db.session.commit()

            # Add any child pages
            child_page_names = page_data.get('child_pages', [])
            if child_page_names:
                for page_name in child_page_names:
                    child_page = Page.query.filter_by(name=page_name).first()
                    if child_page:
                        child_page.parent_id = page.id

                        # Set all the child pages endpoint rules to be the same default as the parent page
                        page_endpoint_rules = PageEndpointRule.query.filter_by(page_id=child_page.id).all()
                        endpoint_rule_ids = [p_er.endpoint_rule_id for p_er in page_endpoint_rules]
                        endpoint_rules = EndpointRule.query.filter(EndpointRule.id.in_(endpoint_rule_ids)).all()
                        for er in endpoint_rules:
                            er.default = page_is_default
                        db.session.commit()
            

            api_endpoints = page_data.get('api_endpoints', [])
            if api_endpoints:
                for endpoint_name, endpoint_data in api_endpoints.items():
                    allowed_fields = None
                    if endpoint_data:
                        allowed_fields = endpoint_data.get('allowed_fields', [])
                    endpoint = Endpoint.query.filter_by(name=endpoint_name).first()
                    if not endpoint:
                        print(f'Endpoint "{endpoint_name}" does not exist. Skipping...')
                        continue

                    endpoint_rule = EndpointRule.query.filter_by(endpoint_id=endpoint.id, allowed_fields=allowed_fields, default=page_is_default, public=page_is_public).first()
                    if not endpoint_rule:
                        endpoint_rule = helper.get_endpoint_rule_for_page(endpoint_id=endpoint.id, page_id=page.id, public=page_is_public)
                        if not endpoint_rule:
                            endpoint_rule = EndpointRule(endpoint_id=endpoint.id, allowed_fields=allowed_fields, default=page_is_default, public=page_is_public)
                            db.session.add(endpoint_rule)
                        else:
                            endpoint_rule.allowed_fields = allowed_fields
                        
                    page_endpoint_rule = PageEndpointRule.query.filter_by(page_id=page.id, endpoint_rule_id=endpoint_rule.id).first()
                    if not page_endpoint_rule:
                        page_endpoint_rule = PageEndpointRule(page_id=page.id, endpoint_rule_id=endpoint_rule.id)
                        db.session.add(page_endpoint_rule)
                    
                    db.session.commit()

def assign_role_to_page_recursive(role, page, default=False):
    if page:
        role_page = RolePage.query.filter_by(role_id=role.id, page_id=page.id).first()
        if not role_page:
            role_page = RolePage(role_id=role.id, page_id=page.id, default=default)
            db.session.add(role_page)
        if page.children:
            for child in page.children:
                assign_role_to_page_recursive(role, child, default)

def generate_roles(folder, parent_folder=None, default=False):
    added_roles_names = []
    if not parent_folder:
        # Go two levels up from this script (from util/ to common/ to jams/)
        parent_folder = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    roles_yaml_path = os.path.join(parent_folder, folder, 'roles.yaml')
    data = load_yaml(roles_yaml_path)
    roles = data.get('roles', {})

    if roles:
        for role_name, role_data in roles.items():
            added_roles_names.append(role_name)
            role = Role.query.filter_by(name=role_name).first()
            role_description = role_data.get('description', [])
            if not role:
                role = Role(name=role_name, description=role_description, default=default)
                db.session.add(role)
            else:
                role.description = role_description
            
            db.session.commit()

            page_names = role_data.get('pages', [])
            if page_names:
                for page_name in page_names:
                    page = Page.query.filter_by(name=page_name).first()
                    assign_role_to_page_recursive(role, page, default)
                    db.session.commit()
                    
    return added_roles_names

def load_all_roles():
    added_role_names = []

    added_role_names.extend(generate_roles(folder='default_config', default=True))
    script_dir = os.path.dirname(__file__)
    parent_dir = os.path.abspath(os.path.join(script_dir, "..", "..", ".."))  # back to jams/
    added_role_names.extend(generate_roles(folder='config', parent_folder=parent_dir))

    current_roles_in_db = Role.query.all()

    for role in current_roles_in_db:
        if role.name not in added_role_names:
            # Delete the role
            if not helper.prep_delete_role(role):
                print(f'Error deleting role: {role.name}')
            else:
                db.session.delete(role)
    
    db.session.commit()

def generate_role_endpoint_rules_for_role(role_id):
    pages = [Page.query.filter_by(id=role_page.page_id).first() for role_page in RolePage.query.filter_by(role_id=role_id).all()]

    for page in pages:
        endpoint_rule_ids = [page_endpoint_rule.endpoint_rule_id for page_endpoint_rule in PageEndpointRule.query.filter_by(page_id=page.id).all()]

        for endpoint_rule_id in endpoint_rule_ids:
            # Check if there is a link between the role and the endpoint. If not, add it
            role_endpoint_rule = RoleEndpointRule.query.filter_by(role_id=role_id, endpoint_rule_id=endpoint_rule_id).first()

            if not role_endpoint_rule:
                role_endpoint_rule = RoleEndpointRule(role_id=role_id, endpoint_rule_id=endpoint_rule_id)
                db.session.add(role_endpoint_rule)
    db.session.commit()

def generate_role_endpoint_rules():
    pages = Page.query.all()

    for page in pages:
        role_ids = [role_page.role_id for role_page in RolePage.query.filter_by(page_id=page.id).all()]
        endpoint_rule_ids = [page_endpoint_rule.endpoint_rule_id for page_endpoint_rule in PageEndpointRule.query.filter_by(page_id=page.id).all()]

        for role_id in role_ids:
            for endpoint_rule_id in endpoint_rule_ids:
                role_endpoint_rule = RoleEndpointRule.query.filter_by(role_id=role_id, endpoint_rule_id=endpoint_rule_id).first()

                if not role_endpoint_rule:
                    role_endpoint_rule = RoleEndpointRule(role_id=role_id, endpoint_rule_id=endpoint_rule_id)
                    db.session.add(role_endpoint_rule)
    
    db.session.commit()

def generate_roles_file_from_db():
    script_dir = os.path.dirname(__file__)
    parent_dir = os.path.abspath(os.path.join(script_dir, os.pardir))
    roles_yaml_path = os.path.join(parent_dir, 'config', 'roles.yaml')

    data = {'roles': {}}

    # Assuming you have SQLAlchemy models named Role and RolePage
    roles_from_db = Role.query.all()

    for role in roles_from_db:
        pages = RolePage.query.filter_by(role_id=role.id, default=False).all()

        if pages:
            role_data = {
                'description': role.description,
                'pages': [Page.query.filter_by(id=page.page_id).first().name for page in pages]
            }

            role_data['description'] = role.description

            # Add role data to the 'roles' section
            
            data['roles'][role.name] = role_data

    # Save the new data structure to the YAML file
    save_yaml(roles_yaml_path, data)


def load_yaml(file_path):
    try:
        with open(file_path, 'r') as file:
            return yaml.safe_load(file)
    except FileNotFoundError:
        return {}
    
def save_yaml(file_path, data):
    with open(file_path, 'w') as file:
        yaml.dump(data, file, default_flow_style=False)

def ensure_key_exists(data, key):
    if key not in data:
        data[key] = {}
    return data[key]

def remove_pages_from_role(role_id):
    role_pages = RolePage.query.filter_by(role_id=role_id).all()
    for role_page in role_pages:
        if not role_page.default:
            role_page_endpoint_rule_ids = [rule.endpoint_rule_id for rule in PageEndpointRule.query.filter_by(page_id=role_page.page_id).all()]
            for id in role_page_endpoint_rule_ids:
                role_endpoint = RoleEndpointRule.query.filter_by(endpoint_rule_id=id, role_id=role_id).first()
                if role_endpoint:
                    db.session.delete(role_endpoint)
            
            db.session.commit()
            db.session.delete(role_page)
    db.session.commit()

def update_pages_assigned_to_role(role_id, page_ids):
    remove_pages_from_role(role_id)

    # Add the pages to the role
    for page_id in page_ids:
        role = Role.query.filter_by(id=role_id).first()
        page = Page.query.filter_by(id=page_id).first()

        if page.parent_id and page.parent_id not in page_ids:
            continue

        assign_role_to_page_recursive(role, page)
    db.session.commit()

    # Generate role endpoint rules
    generate_role_endpoint_rules_for_role(role_id)