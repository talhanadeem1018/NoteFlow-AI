"""add processing_jobs table for background async processing

Revision ID: 008
Revises: 007
Create Date: 2026-07-24
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

# revision identifiers
revision = '008'
down_revision = '007'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create processing_jobs table.

    NOTE: Some databases already contain a processing_jobs table because it
    was bootstrapped out-of-band before Alembic took over – e.g. via
    ``Base.metadata.create_all`` in ``app/db/init_db.py`` (a dev convenience).
    In that case ``CREATE TABLE`` would fail and the existing rows would be at
    risk. To stay safe:

      * If the table already exists, we do NOT drop or recreate it. We simply
        reconcile the schema so it matches what the CREATE TABLE below would
        have produced (aligning the missing server defaults), then move on.
      * If the table does not exist (fresh database), we create it normally.
    """
    bind = op.get_bind()
    if sa.inspect(bind).has_table("processing_jobs"):
        # Reconcile an existing table instead of recreating it. SET DEFAULT is
        # a metadata-only change – no rows are rewritten or dropped.
        op.execute(
            sa.text(
                "ALTER TABLE processing_jobs "
                "ALTER COLUMN id SET DEFAULT gen_random_uuid(), "
                "ALTER COLUMN status SET DEFAULT 'pending', "
                "ALTER COLUMN progress_message SET DEFAULT 'Starting...'"
            )
        )
        return

    op.create_table(
        'processing_jobs',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', UUID(as_uuid=True), nullable=False, index=True),
        sa.Column('video_url', sa.String(500), nullable=False),
        sa.Column('status', sa.String(20), nullable=False, server_default='pending', index=True),
        sa.Column('video_metadata', sa.String(2000), nullable=True),
        sa.Column('transcript_id', UUID(as_uuid=True), nullable=True),
        sa.Column('note_id', UUID(as_uuid=True), nullable=True),
        sa.Column('error_message', sa.Text, nullable=True),
        sa.Column('progress_message', sa.String(255), nullable=True, server_default='Starting...'),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    """Drop processing_jobs table."""
    op.drop_table('processing_jobs')
