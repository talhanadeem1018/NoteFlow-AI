"""add ai notes fields to notes table

Revision ID: 007
Revises: 
Create Date: 2026-07-20
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSON

# revision identifiers
revision = '007'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add AI notes generation fields to notes table."""
    
    # Add new columns for AI-generated notes
    op.add_column('notes', sa.Column('transcript_id', UUID(as_uuid=True), nullable=True))
    op.add_column('notes', sa.Column('executive_summary', sa.Text, nullable=True))
    op.add_column('notes', sa.Column('key_concepts', JSON, nullable=True))
    op.add_column('notes', sa.Column('detailed_notes', sa.Text, nullable=True))
    op.add_column('notes', sa.Column('bullet_points', JSON, nullable=True))
    op.add_column('notes', sa.Column('keywords', JSON, nullable=True))
    op.add_column('notes', sa.Column('action_items', JSON, nullable=True))
    op.add_column('notes', sa.Column('conclusion', sa.Text, nullable=True))
    op.add_column('notes', sa.Column('model_used', sa.String(100), nullable=True))
    op.add_column('notes', sa.Column('prompt_version', sa.String(20), nullable=True))
    op.add_column('notes', sa.Column('processing_time', sa.Float, nullable=True))
    
    # Add foreign key constraint for transcript_id
    op.create_foreign_key(
        'fk_notes_transcript_id',
        'notes',
        'transcripts',
        ['transcript_id'],
        ['id'],
        ondelete='SET NULL'
    )
    
    # Add index for transcript_id for faster lookups
    op.create_index('ix_notes_transcript_id', 'notes', ['transcript_id'])


def downgrade() -> None:
    """Remove AI notes fields from notes table."""
    
    # Drop index
    op.drop_index('ix_notes_transcript_id', table_name='notes')
    
    # Drop foreign key
    op.drop_constraint('fk_notes_transcript_id', 'notes', type_='foreignkey')
    
    # Drop columns
    op.drop_column('notes', 'processing_time')
    op.drop_column('notes', 'prompt_version')
    op.drop_column('notes', 'model_used')
    op.drop_column('notes', 'conclusion')
    op.drop_column('notes', 'action_items')
    op.drop_column('notes', 'keywords')
    op.drop_column('notes', 'bullet_points')
    op.drop_column('notes', 'detailed_notes')
    op.drop_column('notes', 'key_concepts')
    op.drop_column('notes', 'executive_summary')
    op.drop_column('notes', 'transcript_id')
