# Code Review Checklist

## Functionality

- [ ] Does the code do what the requirement asks?
- [ ] Are edge cases handled?
- [ ] Is error handling appropriate?
- [ ] Are there race conditions?
- [ ] Does it handle concurrent requests?

## Correctness

- [ ] No logic errors?
- [ ] Correct Zod validation schemas?
- [ ] Correct Drizzle ORM queries?
- [ ] Correct TypeScript types?
- [ ] No implicit any?

## Security

- [ ] Authentication checked?
- [ ] Authorization checked (ownership)?
- [ ] Input validation (Zod)?
- [ ] No SQL injection risk?
- [ ] No secrets in code?
- [ ] No sensitive data in logs?
- [ ] No XSS risk in rendered content?
- [ ] Rate limiting appropriate?

## Performance

- [ ] No N+1 queries?
- [ ] Appropriate indexes on new queries?
- [ ] No blocking operations in hot path?
- [ ] Pagination for list endpoints?

## Maintainability

- [ ] Code follows conventions?
- [ ] No unnecessary complexity?
- [ ] No duplicate code?
- [ ] Functions are reasonably sized?
- [ ] No commented-out code?
- [ ] No TODO comments without issue links?

## Testing

- [ ] New functionality has tests?
- [ ] Edge cases covered?
- [ ] Integration points tested?

## Documentation

- [ ] Complex logic explained?
- [ ] API changes documented in OpenAPI?
- [ ] Environment variables documented?
