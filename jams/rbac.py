import os
import yaml
from jams.models import db, Page, EndpointRule, Role, RolePage, RoleEndpointRule, PageEndpointRule
from jams.util import helper

def generate_full_rbac():
    clear_rbac()
    generate_endpoints_structure()
    generate_roles()
    generate_role_endpoint_rules()

def clear_rbac():
    db.session.query(PageEndpointRule).delete()
    db.session.query(RoleEndpointRule).delete()
    db.session.query(RolePage).delete()
    db.session.query(EndpointRule).delete()
    db.session.query(Page).delete()

def generate_endpoints_structure():
    script_dir = os.path.dirname(__file__)
    pages_yaml_path = os.path.join(script_dir, 'default_config', 'pages.yaml')
    with open(pages_yaml_path) as stream:
        try:
            data = yaml.safe_load(stream)
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
        except yaml.YAMLError as e:
            print(e)

def generate_roles():
    script_dir = os.path.dirname(__file__)
    pages_yaml_path = os.path.join(script_dir, 'default_config', 'roles.yaml')
    with open(pages_yaml_path) as stream:
        try:
            data = yaml.safe_load(stream)
            roles = data.get('roles', {})

            if roles:
                for role_name, role_data in roles.items():
                    role = Role.query.filter_by(name=role_name).first()
                    role_description = role_data.get('description', [])
                    if not role:
                        role = Role(name=role_name, description=role_description, default=True)
                        db.session.add(role)
                    else:
                        role.description = role_description
                    
                    db.session.commit()

                    page_names = role_data.get('pages', [])
                    if page_names:
                        for page_name in page_names:
                            page = Page.query.filter_by(name=page_name).first()
                            if page:
                                role_page = RolePage.query.filter_by(role_id=role.id, page_id=page.id).first()
                                if not role_page:
                                    role_page = RolePage(role_id=role.id, page_id=page.id, default=True)
                                    db.session.add(role_page)
                                    db.session.commit()
                            
        except yaml.YAMLError as e:
            print(e)


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