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
    """Create processing_jobs table."""
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
