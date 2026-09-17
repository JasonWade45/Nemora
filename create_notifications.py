import os
import requests

user = "postgres.lqtzorufwtllchixrgag"
password = "7#Y3Xsewx?Hi5#p"

# Use Supabase REST to run SQL via the transaction pooler (port 6543)
url = "https://aws-1-eu-west-1.pooler.supabase.com:6543/postgres"
# Actually let's use the Supabase SQL API
# Try with the direct connection pooler on port 6543
import psycopg2

conn = psycopg2.connect(
    host="aws-1-eu-west-1.pooler.supabase.com",
    port=6543,
    dbname="postgres",
    user=user,
    password=password,
    connect_timeout=10,
)
cur = conn.cursor()

cur.execute("""
CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'SYSTEM',
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
""")

cur.execute("CREATE INDEX IF NOT EXISTS ix_notifications_user_id ON notifications(user_id);")
cur.execute("CREATE INDEX IF NOT EXISTS ix_notifications_is_read ON notifications(is_read);")
cur.execute("CREATE INDEX IF NOT EXISTS ix_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;")

conn.commit()
cur.close()
conn.close()
print("notifications table created!")
