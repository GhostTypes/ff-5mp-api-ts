<!-- Metadata
title: Rules Reference
permalink: /rules/index.html
eleventyNavigation: {'key': 'rules', 'parent': 'use eslint', 'title': 'Rules Reference', 'order': 5}
-->





Rules in ESLint are grouped by type to help you understand their purpose. Each rule has emojis denoting:

{{ ruleCategories({
        index: true,
        recommended: true,
        fixable: true,
        frozen: true,
        hasSuggestions: true
}) }}



<h2 id="{{ rules_categories[type].displayName | slugify }}"> {{ rules_categories[type].displayName }} </h2>

{{ rules_categories[type].description | safe }}

    

    
    
    

    
    
    
    
    
    

    {{ rule({
            name: name_value,
            deprecated: deprecated_value,
            description: description_value,
            categories: {
                recommended: isRecommended,
                fixable: isFixable,
                frozen: isFrozen,
                hasSuggestions: isHasSuggestions
            }
    }) }}
    





<h2 id="{{ rules_categories.deprecated.displayName | slugify }}">{{ rules_categories.deprecated.displayName }}</h2>

{{ rules_categories.deprecated.description | safe }}








    {{ rule({
            name: name_value,
            deprecated: true,
            replacedBy: isReplacedBy,
            categories: {
                recommended: isRecommended,
                fixable: isFixable,
                hasSuggestions: isHasSuggestions
            }
    }) }}






<h2 id="{{ rules_categories.removed.displayName | slugify }}">{{ rules_categories.removed.displayName }}</h2>

{{ rules_categories.removed.description | safe }}





    {{ rule({
            name: name_value,
            removed: true,
            replacedBy: isReplacedBy
    }) }}




{# <!-- markdownlint-disable-file MD046 --> #}
