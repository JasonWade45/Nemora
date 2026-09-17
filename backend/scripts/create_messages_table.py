"""Create messages table."""
import sqlalchemy as sa
from sqlalchemy import text

DATABASE_URL = "postgresql://postgres.lqtzorufwtllchixrgag:7%23Y3Xsewx%3FHi5%23p@aws-1-eu-west-1.pooler.supabase.com:5432/postgres"

engine = sa.create_engine(DATABASE_URL)

with engine.begin() as conn:
    result = conn.execute(text(
        "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'messages')"
    ))
    exists = result.scalar()
    if not exists:
        conn.execute(text("""
            CREATE TABLE messages (
                id VARCHAR(36) PRIMARY KEY,
                organization_id VARCHAR(36) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
                sender_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                receiver_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
                group_name VARCHAR(100),
                content TEXT NOT NULL,
                message_type VARCHAR(20) DEFAULT 'TEXT',
                is_read BOOLEAN DEFAULT FALSE NOT NULL,
                created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
            )
        """))
        conn.execute(text("CREATE INDEX ix_messages_org ON messages(organization_id)"))
        conn.execute(text("CREATE INDEX ix_messages_sender ON messages(sender_id)"))
        conn.execute(text("CREATE INDEX ix_messages_receiver ON messages(receiver_id)"))
        conn.execute(text("CREATE INDEX ix_messages_created ON messages(created_at)"))
        print("Created messages table with indexes.")
    else:
        print("Table messages already exists.")
