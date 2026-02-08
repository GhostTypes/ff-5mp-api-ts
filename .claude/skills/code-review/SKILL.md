---
name: code-review
description: Automated code review using Gemini CLI after completing coding tasks. Use when Claude needs to invoke Gemini for thorough code analysis, bug detection, security review, or quality assessment of implemented features. Automatically gathers full context from chat history, invokes Gemini in read-only analysis mode with --yolo flag, and provides comprehensive review feedback. Ideal for post-implementation review, multi-file changes, or when user requests external validation.
---

# Code Review with Gemini CLI

This skill enables automated code review by invoking Google's Gemini models via gemini-cli after completing coding work. Gemini provides a fresh perspective, thorough analysis, and can run tests to verify implementation correctness.

## When to Invoke This Skill

**Trigger this skill when:**
- User explicitly requests code review ("review my code", "get Gemini's opinion", "ask Gemini to review")
- After implementing significant features or refactoring
- Before committing complex changes
- When you want external validation of implementation
- After fixing difficult bugs to ensure correctness
- For security review of sensitive code paths

## Prerequisites

Gemini CLI must be installed and authenticated:
```bash
# Check installation
which gemini

# If not installed
npm install -g @google/gemini-cli

# Authenticate (first time only, interactive)
gemini
```

## Core Workflow

### Step 1: Gather Complete Context

Before invoking Gemini, gather ALL relevant context from the current session:

**What to include:**
1. **All files changed or created** - Get the complete diff or file contents
2. **Original task description** - What was the user trying to accomplish?
3. **Your approach** - What implementation strategy did you choose?
4. **Constraints or requirements** - Any specific user requests, tech constraints
5. **Related files** - Files that were read or referenced during implementation
6. **Error messages or issues** - Any problems encountered during implementation

**How to gather context:**

For multiple file changes:
```bash
# Get git diff of all changes
git diff HEAD --no-color > /tmp/changes.diff

# Or get file contents directly
cat src/feature/file1.ts src/feature/file2.ts src/feature/test.ts > /tmp/context.txt
```

For single file changes:
```bash
cat path/to/file.ts > /tmp/context.txt
```

Include the task description and context:
```bash
cat > /tmp/review_context.txt << 'EOF'
# Task: Implement user authentication with JWT

# What was implemented:
- Created JWT service for token generation and validation
- Added login endpoint with password hashing
- Implemented middleware for protected routes
- Added unit tests for auth service

# Files changed:
- src/services/auth.ts (new)
- src/routes/auth.ts (new)
- src/middleware/auth.ts (new)
- tests/auth.test.ts (new)

# Approach:
Used bcrypt for password hashing, jsonwebtoken for JWT.
Refresh tokens stored in Redis (not yet implemented).
Email verification planned but deferred.

# Requirements:
- Must validate password strength (min 8 chars, special char)
- JWT expires after 24 hours
- Follow OWASP security guidelines
EOF
```

### Step 2: Build the Review Prompt

Create a comprehensive prompt that explains:
1. **What you want reviewed** - Specific files or features
2. **The review scope** - Security? Performance? Best practices? All of the above?
3. **Context** - Task description, requirements, constraints
4. **Read-only mode** - Emphasize Gemini should only analyze, not modify

**Example prompts:**

**General code review:**
```
Please review the following code changes for a [feature description].

Context:
- Task: [what was being implemented]
- Files: [list files]
- Approach: [implementation strategy]
- Requirements: [specific constraints or requirements]

[Include file contents or diff here]

Please analyze:
1. **Correctness** - Does the code achieve the stated goals?
2. **Bugs** - Any obvious or subtle bugs?
3. **Security** - Security vulnerabilities, injection risks, authentication issues
4. **Performance** - Performance concerns, inefficient patterns
5. **Best practices** - Language/framework best practices, code organization
6. **Testing** - Are tests adequate? Any edge cases missing?
7. **Documentation** - Is code well-documented? Any missing comments?

IMPORTANT: You are in READ-ONLY analysis mode. Do not make any changes to files.
Run tests if needed to verify correctness, but report findings only - do not modify code.
Provide your analysis in a structured format with clear sections.
```

**Security-focused review:**
```
Please perform a thorough security review of this authentication implementation.

Context:
- Implementing JWT-based authentication
- Password hashing with bcrypt
- Protected routes with middleware

[Include code]

Focus specifically on:
- OWASP Top 10 vulnerabilities
- Password handling and hashing
- JWT security (token validation, expiration handling)
- Injection vulnerabilities (SQL, command, XSS)
- Authentication/authorization bypasses
- Sensitive data exposure

You MAY run tests to verify security properties, but DO NOT modify any code.
Report your findings with severity levels (Critical/High/Medium/Low).
```

**Bug fix verification:**
```
Please verify this bug fix is correct and complete.

Original issue:
[Describe the bug that was reported]

Fix implemented:
[Explain the fix approach]

[Include the fixed code]

Please verify:
1. Does the fix actually resolve the issue?
2. Are there any edge cases not handled?
3. Could this fix introduce new bugs?
4. Are there better ways to fix this?
5. Should related code be updated?

Run tests if needed to verify the fix works. DO NOT modify code - only report findings.
```

### Step 3: Invoke Gemini with Proper Flags

**Always use these flags:**
- `--yolo` - Auto-approve all tool uses (test execution, file reading)
- `--model` or `-m` - Explicitly specify model
- `--output-format json` - For programmatic parsing (optional, for integration)
- `--include-directories` - Include project context (optional but recommended)

**Model selection strategy:**

1. **First choice:** `gemini-3-pro-preview` - Most capable, best for deep analysis
   ```bash
   gemini --yolo -m gemini-3-pro-preview -p "Review prompt here"
   ```

2. **Fallback 1:** `gemini-3-flash-preview` - Fast, still very capable
   ```bash
   gemini --yolo -m gemini-3-flash-preview -p "Review prompt here"
   ```

3. **Fallback 2:** `gemini-2.5-pro` - Reliable backup
   ```bash
   gemini --yolo -m gemini-2.5-pro -p "Review prompt here"
   ```

**When to fall back:**
- Rate limit errors (HTTP 429)
- Model unavailable errors
- Very long context that exceeds model limits

### Step 4: Include Project Context

For better reviews, give Gemini access to the codebase:

```bash
# Include specific directories
gemini --yolo -m gemini-3-pro-preview \
  --include-directories src,tests,docs \
  -p "Review the authentication implementation"

# Include entire project (for small projects)
gemini --yolo -m gemini-3-pro-preview \
  --include-directories . \
  -p "Review this full refactoring"
```

### Step 5: Present Results to User

After Gemini completes the review:

1. **Summarize key findings** - Highlight critical issues first
2. **Organize by severity** - Critical → High → Medium → Low → Info
3. **Provide actionable recommendations** - Specific fixes, not just "fix this"
4. **Include positive feedback** - What was done well?
5. **Ask for next steps** - Should issues be fixed? Re-review after fixes?

**Example presentation:**
```
## Gemini Code Review Results

### Critical Issues (2)
1. **SQL Injection Vulnerability** in `src/auth/login.ts:45`
   - User input directly concatenated into SQL query
   - Fix: Use parameterized queries or ORM
   - Code: `const query = "SELECT * FROM users WHERE email = '" + email + "'"`

2. **Missing JWT Secret Validation** in `src/services/auth.ts:12`
   - JWT secret not validated, defaults to undefined
   - Fix: Add secret validation on startup

### High Priority Issues (3)
1. **Weak Password Requirements** in `src/routes/auth.ts:30`
   - Only checks length, not complexity
   - Fix: Require special character and number

[... more issues ...]

### What's Done Well
- Clean separation of concerns (services, routes, middleware)
- Good use of bcrypt for password hashing
- Comprehensive test coverage

### Recommendations
1. Fix critical security issues immediately
2. Add rate limiting to login endpoint
3. Implement refresh token rotation
4. Add logging for authentication failures

Would you like me to fix any of these issues?
```

## Complete Example Workflow

Here's a complete example showing the full workflow:

```bash
# Step 1: Gather context - Get all changed files
git diff main --stat  # See what changed
git diff main > /tmp/changes.diff  # Get full diff

# Step 2: Build comprehensive prompt
cat > /tmp/review_prompt.txt << 'EOF'
Please review this implementation of a user registration system.

Task: Implement user registration with email verification

Files changed:
- src/routes/auth.ts (registration endpoint)
- src/services/user.ts (user service)
- src/email/verifier.ts (email verification)
- tests/registration.test.ts (tests)

Requirements:
- Email must be valid format
- Password: min 8 chars, 1 uppercase, 1 number, 1 special char
- Email verification required before account activation
- Rate limiting: max 5 registrations per IP per hour

Implementation approach:
- Express.js for REST API
- PostgreSQL with Prisma ORM
- SendGrid for email verification
- Redis for rate limiting

Please review for:
1. Security vulnerabilities (especially OWASP Top 10)
2. Correctness - does it meet requirements?
3. Edge cases not handled
4. Performance concerns
5. Best practices violations
6. Test coverage gaps

You MAY run tests to verify behavior, but DO NOT modify any code.
Provide findings in structured format with severity levels.

EOF

# Step 3: Include the actual code changes
cat /tmp/changes.diff >> /tmp/review_prompt.txt

# Step 4: Invoke Gemini with best model
gemini --yolo \
  -m gemini-3-pro-preview \
  --include-directories src,tests \
  -p "$(cat /tmp/review_prompt.txt)" \
  | tee /tmp/gemini_review.txt

# Step 5: Parse and present results
# (Review /tmp/gemini_review.txt and summarize for user)
```

## Read-Only Mode Enforcement

**CRITICAL:** Always emphasize to Gemini that it's in READ-ONLY mode.

**Include this in every prompt:**
```
IMPORTANT SECURITY CONSTRAINT:
You are operating in READ-ONLY ANALYSIS MODE.
- You MAY read files to understand code
- You MAY run tests to verify behavior
- You MAY search code for patterns
- You MUST NOT modify, edit, write, or delete any files
- You MUST NOT execute commands that change system state
- Report all findings - do not implement fixes
```

**If Gemini attempts to modify files:**
- The review failed the read-only constraint
- Inform the user immediately
- Re-invoke with stronger read-only emphasis
- Consider using a different model with better instruction following

## Model Fallback Strategy

**Implementation fallback:**

```bash
#!/bin/bash
# Try models in order, fall back on failure

MODELS=("gemini-3-pro-preview" "gemini-3-flash-preview" "gemini-2.5-pro")
PROMPT_FILE="/tmp/review_prompt.txt"

for model in "${MODELS[@]}"; do
  echo "Trying model: $model"
  if gemini --yolo -m "$model" -p "$(cat "$PROMPT_FILE")" > /tmp/review_result.txt 2>&1; then
    echo "Review succeeded with $model"
    cat /tmp/review_result.txt
    exit 0
  else
    echo "Failed with $model, trying next model..."
  fi
done

echo "All models failed"
exit 1
```

**Manual fallback decision tree:**

```
Try gemini-3-pro-preview
  ↓
Rate limited or unavailable?
  ↓ Yes
Try gemini-3-flash-preview
  ↓
Rate limited or unavailable?
  ↓ Yes
Try gemini-2.5-pro
  ↓
Still failing?
  ↓ Yes
Inform user: All Gemini models unavailable, try again later
```

## Advanced Techniques

### Running Tests During Review

Gemini can run tests to verify implementation:

```bash
gemini --yolo \
  -m gemini-3-pro-preview \
  --include-directories src,tests \
  -p "Review this authentication system. Run the test suite to verify all tests pass. DO NOT modify code - only run tests and report results."
```

**What Gemini can do:**
- Run test suites (npm test, pytest, cargo test, etc.)
- Run specific test files
- Run tests with coverage reports
- Verify edge cases with targeted tests

**What Gemini cannot do (read-only):**
- Modify test code
- Add new tests
- Fix failing tests
- Modify source code to make tests pass

### Comparative Review

Ask Gemini to compare before/after:

```bash
git diff main^ main > /tmp/before_after.diff

gemini --yolo \
  -m gemini-3-pro-preview \
  -p "Compare the before and after code in this diff. Analyze:
  1. What changed and why?
  2. Is the new approach better?
  3. Were any bugs introduced?
  4. Are there unintended side effects?
  5. Performance implications?"
```

### Focused Domain Reviews

**Performance review:**
```bash
gemini --yolo -m gemini-3-pro-preview \
  -p "Analyze this code purely from a performance perspective:
  - Time complexity analysis
  - Inefficient algorithms or data structures
  - Unnecessary database queries
  - Caching opportunities
  - Memory leaks or excessive allocations"
```

**Architecture review:**
```bash
gemini --yolo -m gemini-3-pro-preview \
  -p "Review the architecture of this system:
  - Design patterns used (appropriate?)
  - Separation of concerns
  - Coupling and cohesion
  - Scalability concerns
  - Maintainability
  - Suggested refactoring"
```

**Security review:**
```bash
gemini --yolo -m gemini-3-pro-preview \
  -p "Perform a security audit focusing on:
  - OWASP Top 10
  - Injection vulnerabilities
  - Authentication/authorization
  - Sensitive data handling
  - Cryptographic issues
  - Input validation"
```

## Integration with Git Workflow

### Pre-commit Review Hook

Create `.git/hooks/pre-commit`:

```bash
#!/bin/bash
# Automated code review before commit

# Get staged changes
CHANGED_FILES=$(git diff --cached --name-only --diff-filter=ACM)

if [ -z "$CHANGED_FILES" ]; then
  exit 0
fi

echo "Running Gemini code review on staged changes..."

# Build review context
{
  echo "Review these staged changes before commit:"
  echo ""
  git diff --cached
} > /tmp/review_input.txt

# Run review
gemini --yolo \
  -m gemini-3-flash-preview \
  -p "$(cat /tmp/review_input.txt)

Please review these changes for:
- Obvious bugs
- Security issues
- Breaking changes
- Missing tests

Report findings concisely. DO NOT modify files." \
  > /tmp/review_output.txt

# Show results
cat /tmp/review_output.txt

# Ask if user wants to continue
echo ""
read -p "Continue with commit? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Commit cancelled"
  exit 1
fi

exit 0
```

### Post-merge Review

```bash
# After merging, review the merge commit
git log -1 --pretty=%H > /tmp/merge_commit.txt

gemini --yolo -m gemini-3-pro-preview \
  --include-directories src,tests \
  -p "Review this merge commit for:
  - Merge conflicts that may not be resolved correctly
  - Integration issues between branches
  - Breaking changes
  - Test failures

$(git show $(cat /tmp/merge_commit.txt))"
```

## Troubleshooting

### Gemini Not Installed
```bash
npm install -g @google/gemini-cli
# Or
npx @google/gemini-cli
```

### Authentication Issues
```bash
# Re-authenticate
gemini

# Check API key is set
echo $GEMINI_API_KEY
```

### Rate Limiting
```bash
# Fall back to flash model
gemini --yolo -m gemini-3-flash-preview -p "..."

# Or fall back to 2.5
gemini --yolo -m gemini-2.5-pro -p "..."
```

### Model Not Available
```bash
# Check available models
gemini --help | grep -A 20 model

# Use fallback model
gemini --yolo -m gemini-2.5-pro -p "..."
```

### Read-Only Violations
If Gemini attempts to modify files:

1. **Re-invoke with explicit constraint:**
```bash
gemini --yolo -m gemini-3-pro-preview -p "
CRITICAL: You are in READ-ONLY mode.
DO NOT use write_file, edit_file, or any modification tools.
ONLY use read_file, run_shell_command (for tests), and search tools.

[prompt continues...]
"
```

2. **Use stricter model:** Some models follow instructions better than others
   - `gemini-3-pro-preview` generally has best instruction following
   - Avoid `gemini-2.5-flash-lite` for complex read-only tasks

## Best Practices

1. **Always use `--yolo`** - Enables Gemini to run tests and read files without permission prompts
2. **Specify model explicitly** - Consistent behavior, no surprises
3. **Include full context** - The more Gemini knows, the better the review
4. **Emphasize read-only mode** - Prevents accidental modifications
5. **Use JSON output when parsing** - Easier to extract findings programmatically
6. **Implement model fallback** - Don't let rate limits block reviews
7. **Review critical findings first** - Security and bugs over style issues
8. **Provide actionable feedback** - Specific fixes, not just "fix this"
9. **Acknowledge what's done well** - Positive reinforcement for good code
10. **Follow up on fixes** - Re-review after addressing issues

## Sample Prompts Library

### Quick Review (5-10 min)
```
Quick review of this change for obvious bugs and security issues.
[Include code]
```

### Standard Review (10-20 min)
```
Comprehensive review covering correctness, security, performance, and best practices.
[Include full context and code]
```

### Deep Review (20-40 min)
```
Thorough analysis including:
- Security audit (OWASP Top 10)
- Performance analysis with complexity review
- Architecture evaluation
- Test coverage analysis
- Documentation completeness
- Edge case handling
Run full test suite and verify all tests pass.
[Include full context and code]
```

### Security-Only Review
```
Security-focused review analyzing:
- OWASP Top 10 vulnerabilities
- Injection attacks
- Authentication/authorization issues
- Cryptographic weaknesses
- Sensitive data exposure
Run security tests if available.
[Include code]
```

### Performance-Only Review
```
Performance analysis of:
- Algorithmic complexity (Big O)
- Database query efficiency
- Caching strategy
- Memory usage patterns
- I/O operations
Suggest optimizations with expected impact.
[Include code]
```

## Output Format Examples

**JSON parsing for automation:**

```bash
# Get review in JSON format and parse with Python
result=$(gemini --yolo -m gemini-3-pro-preview \
  --output-format json \
  -p "Review this code" \
  | python -c "import sys, json; print(json.load(sys.stdin)['response'])")

# Extract findings
echo "$result" | grep -A 5 "### Critical"
```

**Structured markdown output:**

```markdown
## Code Review: User Authentication Feature

### Summary
[2-3 sentence overview]

### Findings by Severity

#### Critical (2)
1. [Issue description]
   - Location: `file:line`
   - Impact: [What's the risk?]
   - Fix: [Specific recommendation]

#### High (3)
[... more issues ...]

### Positive Findings
- [What was done well]

### Recommendations
1. [Prioritized action items]

### Test Results
- All tests passing: [Yes/No]
- Coverage: [X%]
- Failures: [List if any]
```

## Reference Documentation

For more details on gemini-cli capabilities:
- See gemini-cli skill for general usage patterns
- Headless mode documentation for automation
- Model selection guidelines for choosing the right model
- Configuration options for customization

## Summary

This skill enables automated code review by:
1. Gathering complete context from your implementation work
2. Invoking Gemini CLI with comprehensive review prompts
3. Enforcing read-only analysis mode while allowing test execution
4. Using intelligent model fallback (3 Pro → 3 Flash → 2.5 Pro)
5. Presenting structured, actionable feedback to users

**Key principles:**
- Always use `--yolo` for automated permission
- Emphasize read-only mode strongly
- Include full context for accurate reviews
- Fall back models gracefully on rate limits
- Provide structured, actionable feedback
