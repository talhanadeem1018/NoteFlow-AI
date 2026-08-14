"""add pause/cancel/resume checkpoint fields to processing_jobs

Revision ID: 009
Revises: 008
Create Date: 2026-08-15
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = '009'
down_revision = '008'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add checkpoint and control fields to processing_jobs.

    - current_stage: pipeline checkpoint used for resume
      (metadata → downloading → transcribing → generating_notes → completed)
    - paused_at / cancelled_at / interrupted_at: control timestamps
    - language / force_reprocess: persisted job options so resume() can
      continue with the same transcription settings
    """
    op.add_column('processing_jobs', sa.Column('current_stage', sa.String(30), nullable=True))
    op.add_column('processing_jobs', sa.Column('paused_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('processing_jobs', sa.Column('cancelled_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('processing_jobs', sa.Column('interrupted_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('processing_jobs', sa.Column('language', sa.String(10), nullable=True))
    op.add_column('processing_jobs', sa.Column('force_reprocess', sa.Boolean(), nullable=False, server_default=sa.false()))


def downgrade() -> None:
    """Drop the added columns."""
    op.drop_column('processing_jobs', 'force_reprocess')
    op.drop_column('processing_jobs', 'language')
    op.drop_column('processing_jobs', 'interrupted_at')
    op.drop_column('processing_jobs', 'cancelled_at')
    op.drop_column('processing_jobs', 'paused_at')
    op.drop_column('processing_jobs', 'current_stage')
