import os
import yaml
from jams.models import db, Page, EndpointRule, Role, RolePage, RoleEndpointRule, PageEndpointRule
from jams.util import helper
from jams.extensions import clear_table

def generate_full_rbac():
    clear_rbac()
    generate_endpoints_structure()
    load_all_roles()
    generate_role_endpoint_rules()

def clear_rbac():
    clear_table(PageEndpointRule)
    clear_table(RoleEndpointRule)
    clear_table(RolePage)
    clear_table(EndpointRule)
    clear_table(Page)

def generate_endpoints_structure():
    script_dir = os.path.dirname(__file__)
    pages_yaml_path = os.path.join(script_dir, 'default_config', 'pages.yaml')
    data = load_yaml(pages_yaml_path)
    pages = data.get('pages', {})

    if pages:
        # Get the first key-value pair from the pages dictionary
        for page_name, page_data in pages.items():
            page_endpoint = page_data.get('endpoint', [])
            page = Page.query.filter_by(name=page_name).first()
            if not page:
                page = Page(name=page_name, endpoint=page_endpoint)
                db.session.add(page)
            else:
                page.endpoint = page_endpoint
            
            db.session.commit()

            # Add any child pages
            child_page_names = page_data.get('child_pages', [])
            if child_page_names:
                for page_name in child_page_names:
                    child_page = Page.query.filter_by(name=page_name).first()
                    if child_page:
                        child_page.parent_id = page.id
                        db.session.commit()
            

            backend_endpoints = page_data.get('backend_endpoints', [])
            if backend_endpoints:
                for endpoint_name, endpoint_data in backend_endpoints.items():
                    allowed_fields = None
                    if endpoint_data:
                        allowed_fields = endpoint_data.get('allowed_fields', [])
                    endpoint_rule = EndpointRule.query.filter_by(endpoint=endpoint_name, allowed_fields=allowed_fields).first()
                    if not endpoint_rule:
                        endpoint_rule = helper.get_endpoint_rule_for_page(endpoint_name, page.id)
                        if not endpoint_rule:
                            endpoint_rule = EndpointRule(endpoint=endpoint_name, allowed_fields=allowed_fields)
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
        parent_folder = os.path.dirname(__file__)
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
    parent_dir = os.path.abspath(os.path.join(script_dir, os.pardir))
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