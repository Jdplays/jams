from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from flask_migrate import Migrate
from flask_login import LoginManager

db = SQLAlchemy()
migrate = Migrate()
login_manager = LoginManager()

def clear_table(model):
    if hasattr(db, 'engine'):
        engine = db.engine
    else:
        engine = db

    table_name = model.__tablename__
    with engine.connect() as conn:
        trans = conn.begin()
        try:
            conn.execute(text(f'TRUNCATE TABLE {table_name} RESTART IDENTITY CASCADE'))
            print(f'Table: {table_name} reset')
            trans.commit()
        except SQLAlchemyError as e:
            trans.rollback()
            print(f"Error occurred: {e}")
            print('Rolling back DB')