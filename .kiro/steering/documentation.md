# Documentation and Progress Tracking Rules

## Progress Documentation Requirements

### Always Update docs/PROGRESS.md
When making significant changes to the codebase, you MUST update the `docs/PROGRESS.md` file to track:

- **Feature implementations** - New functionality added
- **Bug fixes** - Issues resolved and their solutions
- **Architecture changes** - Structural modifications to the codebase
- **Migration progress** - Steps completed in the Replit → Supabase migration
- **Database schema changes** - New tables, columns, or relationships
- **API endpoint changes** - New routes or modifications to existing ones
- **UI/UX improvements** - Interface updates and user experience enhancements

### Progress Entry Format
Each entry should include:
```markdown
## [Date] - [Brief Description]

### Changes Made
- Specific change 1
- Specific change 2
- Specific change 3

### Files Modified
- `path/to/file1.ts`
- `path/to/file2.tsx`

### Impact
Brief description of how this affects the application

### Next Steps (if applicable)
- Follow-up task 1
- Follow-up task 2
```

### When to Update Progress
Update `docs/PROGRESS.md` when:
- Adding new features or components
- Fixing significant bugs
- Making database schema changes
- Completing migration milestones
- Refactoring major code sections
- Adding new API endpoints
- Making security or performance improvements

### Documentation Standards
- Use clear, descriptive commit-style messages
- Include file paths for modified files
- Explain the reasoning behind changes
- Note any breaking changes or migration requirements
- Reference related issues or tasks when applicable

### Migration Tracking
Since the project is migrating from Replit to Supabase, always note:
- Which migration phase the change relates to
- Dependencies on other migration tasks
- Testing status of migrated functionality
- Any rollback considerations

## Additional Documentation Rules

### Code Comments
- Add JSDoc comments for complex functions
- Document API endpoints with parameter descriptions
- Explain business logic in church management workflows
- Comment any workarounds or temporary solutions

### README Updates
Update relevant README files when:
- Adding new dependencies
- Changing build or deployment processes
- Modifying environment variable requirements
- Adding new development commands