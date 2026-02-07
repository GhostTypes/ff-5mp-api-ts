# ESLint Documentation Updater

This directory contains the script used to extract and clean ESLint documentation from the official ESLint repository.

## Purpose

When ESLint releases new versions with updated documentation, use this script to refresh the reference documentation in this skill.

## Prerequisites

- Python 3.8 or higher
- PyYAML library (`pip install pyyaml`)
- Git

## Update Process

### 1. Clone the ESLint Repository

Clone the official ESLint repository to a temporary location:

```bash
cd /path/to/temporary/location
git clone https://github.com/eslint/eslint.git
```

### 2. Place the Extraction Script

Copy the `extract_docs.py` script to your temporary location:

```bash
cp /path/to/this/extract_docs.py /path/to/temporary/location/
```

### 3. Run the Extraction Script

Execute the script from the directory containing the cloned eslint repository:

```bash
cd /path/to/temporary/location
python extract_docs.py
```

The script will:
- Read all markdown files from `eslint/docs/src/`
- Extract and convert YAML frontmatter to HTML comments
- Convert Eleventy-specific syntax (`::: correct`, `::: warning`, etc.) to standard markdown
- Remove Eleventy shortcodes
- Output cleaned markdown to an `output/` directory

### 4. Review and Copy Documentation

Review the extracted documentation in the `output/` directory:

```bash
ls output/
```

Expected directories:
- `about/` - About ESLint
- `extend/` - Extension guides (custom rules, parsers, plugins)
- `integrate/` - Integration guides
- `library/` - Component library
- `pages/` - Landing pages
- `rules/` - All ESLint rule documentation (~300+ files)
- `use/` - User guides (getting started, configuration, CLI)

### 5. Remove Unwanted Documentation

Remove directories not needed for the skill (typically maintenance and contribution guides):

```bash
cd output
rm -rf contribute maintain
```

### 6. Update Skill References

Replace the current skill reference documentation with the newly extracted files:

```bash
# Backup current documentation
mv /path/to/eslint-skill/references /path/to/eslint-skill/references.backup

# Copy new documentation
cp -r output /path/to/eslint-skill/references
```

### 7. Verify the Update

Check that the documentation was copied correctly:

```bash
cd /path/to/eslint-skill/references
ls  # Should show: about, extend, integrate, library, pages, rules, use
find . -name "*.md" | wc -l  # Should show ~400 files
```

### 8. Update SKILL.md

Update the version number in SKILL.md to reflect the new ESLint version:

```markdown
Latest ESLint version: X.Y.Z (Month Year)
```

### 9. Test the Skill

Test the skill with common ESLint queries to ensure:
- Rule documentation loads correctly
- Configuration examples are accurate
- Integration guides work as expected

### 10. Clean Up

Remove the temporary directory:

```bash
rm -rf /path/to/temporary/location
```

## Script Details

The `extract_docs.py` script:

1. **Extracts YAML frontmatter** - Converts to HTML comments at the top of each file
2. **Converts Eleventy containers** - Changes `::: correct`, `::: incorrect`, `::: warning`, etc. to standard markdown blockquotes
3. **Removes shortcodes** - Cleans up Eleventy-specific syntax like `{% fixable %}`, `{% recommended %}`
4. **Preserves content** - Keeps all code examples, headings, lists, and standard markdown intact
5. **Maintains structure** - Preserves the directory hierarchy from the source

## Troubleshooting

**Issue: PyYAML not found**
```bash
pip install pyyaml
```

**Issue: Script fails with encoding errors**
- Ensure you're running on a system with UTF-8 support
- On Windows, run the script in a terminal that supports UTF-8

**Issue: Missing files after extraction**
- Verify the eslint repository was cloned correctly
- Check that the script is run from the directory containing the `eslint/` folder
- Ensure the `eslint/docs/src/` directory exists

## Notes

- The extraction script skips directories starting with `_` (like `_data`, `_includes`, `_plugins`)
- The script processes only `.md` files
- Frontmatter is preserved as HTML comments for reference
- All Eleventy-specific syntax is converted to standard markdown for compatibility
