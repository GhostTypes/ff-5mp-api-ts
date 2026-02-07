#!/usr/bin/env python3
"""
ESLint Documentation Extractor

This script extracts and cleans markdown documentation from the ESLint repository,
converting Eleventy-specific syntax to standard markdown.
"""

import os
import re
import shutil
from pathlib import Path
from typing import Dict, Any
import yaml


def extract_frontmatter(content: str) -> tuple[Dict[str, Any], str]:
    """
    Extract YAML frontmatter from markdown content.

    Returns:
        tuple: (frontmatter_dict, remaining_content)
    """
    frontmatter = {}
    remaining = content

    # Check for YAML frontmatter
    if content.startswith('---\n'):
        parts = content.split('---\n', 2)
        if len(parts) >= 3:
            try:
                frontmatter = yaml.safe_load(parts[1]) or {}
                remaining = parts[2]
            except yaml.YAMLError:
                pass

    return frontmatter, remaining


def convert_containers(content: str) -> str:
    """
    Convert Eleventy container syntax to standard markdown.

    Converts:
    - ::: correct / ::: incorrect -> blockquotes with indicators
    - ::: warning / ::: tip / ::: important -> blockquotes with indicators
    """

    # Pattern to match container blocks
    # Matches ::: type\n content \n:::
    container_pattern = r':::\s*(\w+)\s*\n(.*?):::'

    def replace_container(match):
        container_type = match.group(1)
        content = match.group(2).strip()

        # Map container types to markdown representation
        type_map = {
            'correct': '**Correct Example**',
            'incorrect': '**Incorrect Example**',
            'warning': '**Warning**',
            'tip': '**Tip**',
            'important': '**Important**'
        }

        header = type_map.get(container_type, f'**{container_type.title()}**')

        # Format as blockquote
        lines = content.split('\n')
        quoted = '\n'.join(f'> {line}' if line else '>' for line in lines)

        return f'{header}\n\n{quoted}'

    # Replace all containers
    result = re.sub(container_pattern, replace_container, content, flags=re.DOTALL)

    return result


def clean_markdown(content: str) -> str:
    """
    Clean markdown content by converting Eleventy-specific syntax.
    """
    # Convert containers
    content = convert_containers(content)

    # Remove or convert common shortcodes (if needed)
    # Example: {% fixable %} -> just remove
    content = re.sub(r'\{%\s*fixable\s*%\}', '**Fixable**: Some problems can be automatically fixed by the `--fix` command line option.', content)
    content = re.sub(r'\{%\s*recommended\s*%\}', '**Recommended**: This rule is enabled in the `eslint:recommended` configuration.', content)
    content = re.sub(r'\{%\s*hasSuggestions\s*%\}', '**Suggestions**: This rule provides suggestions for manual fixes.', content)

    # Clean up any remaining shortcodes (just remove them for now)
    content = re.sub(r'\{%.*?%\}', '', content)

    return content


def process_markdown_file(input_path: Path, output_path: Path):
    """
    Process a single markdown file: extract frontmatter, clean content, and save.
    """
    # Read the file
    with open(input_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Extract frontmatter
    frontmatter, body = extract_frontmatter(content)

    # Clean the markdown body
    cleaned_body = clean_markdown(body)

    # Build output content with frontmatter as comments
    output_parts = []

    if frontmatter:
        output_parts.append('<!-- Metadata')
        for key, value in frontmatter.items():
            if isinstance(value, list):
                output_parts.append(f'{key}:')
                for item in value:
                    output_parts.append(f'  - {item}')
            else:
                output_parts.append(f'{key}: {value}')
        output_parts.append('-->\n')

    output_parts.append(cleaned_body)

    output_content = '\n'.join(output_parts)

    # Ensure output directory exists
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # Write cleaned content
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(output_content)


def main():
    """Main extraction process."""
    # Paths
    script_dir = Path(__file__).parent
    source_dir = script_dir / 'eslint' / 'docs' / 'src'
    output_dir = script_dir / 'output'

    # Create output directory
    output_dir.mkdir(parents=True, exist_ok=True)

    # Track statistics
    total_files = 0
    processed_files = 0
    skipped_files = 0

    print(f"Extracting ESLint documentation...")
    print(f"Source: {source_dir}")
    print(f"Output: {output_dir}\n")

    # Walk through source directory
    for root, dirs, files in os.walk(source_dir):
        # Skip private directories
        dirs[:] = [d for d in dirs if not d.startswith('_')]

        for file in files:
            if file.endswith('.md'):
                total_files += 1

                # Get relative path
                input_path = Path(root) / file
                rel_path = input_path.relative_to(source_dir)
                output_path = output_dir / rel_path

                try:
                    process_markdown_file(input_path, output_path)
                    processed_files += 1
                    print(f"[OK] {rel_path}")
                except Exception as e:
                    skipped_files += 1
                    print(f"[FAIL] {rel_path}: {e}")

    # Print summary
    print(f"\n{'='*60}")
    print(f"Extraction Complete!")
    print(f"{'='*60}")
    print(f"Total markdown files found: {total_files}")
    print(f"Successfully processed: {processed_files}")
    print(f"Skipped (errors): {skipped_files}")
    print(f"\nOutput directory: {output_dir.absolute()}")


if __name__ == '__main__':
    main()
