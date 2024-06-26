import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.exc import OperationalError

DB_URI = os.getenv('DATABASE_URL', 'postgresql://jams:jams@jams-db:5432/jams-main')

def check_db():
    try:
        engine = create_engine(DB_URI)
        with engine.connect() as connection:
            result = connection.execute("SELECT 1;")
            if result.fetchone()[0] == 1:
                return True
    except OperationalError:
        return False
    return False

def main():
    if check_db():
        sys.exit(1)
    else:
        sys.exit(0)

if __name__ == "__main__":
    main()
