# Heirloom — Product Concept

## The Idea

A private family history platform where multiple families can each build and explore their own genealogy tree. Family members are invited by the tree owner and collaborate together to build out their shared history. An AI assistant helps bring ancestors to life through biographical narratives and answers questions about the family tree.

## Who It's For

- Families researching their ancestry
- People curious about European citizenship eligibility through descent
- Anyone who has a GEDCOM file from another genealogy tool and wants a modern, private place to explore it

## Core Experience

### Build Your Tree

Each family gets their own private tree. The tree owner invites family members by email and controls who can view, edit, or manage the tree. Members can add people, record births, deaths, marriages, occupations, and family relationships. Existing genealogy data can be imported from standard GEDCOM files and exported back out at any time.

### Explore Your Ancestors

An interactive visual family tree lets you click through generations, tracing lines from parents to grandparents and beyond. A searchable directory lists everyone in the tree. You can look people up by name and jump straight to them in the explorer.

### AI-Powered Biographies

With one click, the system generates a rich biographical narrative for any ancestor using AI. It weaves together the dates, places, occupations, and family connections into a readable life story. These narratives can be regenerated as new information is added. A batch mode lets you generate stories for many people at once.

### Ask Questions About Your Family

A conversational AI chat assistant is available from anywhere in the tree. You can ask natural-language questions like "Who is the oldest person in the tree?", "Show me the paternal line from Johann", or "Which ancestors lived in Luxembourg?" The assistant can search the tree, trace lineage lines, look up relatives, and even trigger narrative generation or external record searches on your behalf.

### Lineage Stories

Beyond individual biographies, the system can generate a narrative story that follows an entire lineage line — for example, the paternal line from you back through your father, grandfather, great-grandfather, and so on. These stories are shareable.

### Record Hints from External Sources

The system searches three major genealogy databases — FamilySearch, WikiTree, and Geni — to find potential matches for people in your tree. Matches appear as hints on each person. You can review them side-by-side with your existing data, accept fields you want to import, or dismiss false matches. FamilySearch and Geni require you to connect your own account; WikiTree searches are always available.

### FamilySearch Ancestor Import

If you have a FamilySearch account, you can search for a person and import them along with multiple generations of ancestors directly into your tree.

### European Citizenship Eligibility

Many European countries offer citizenship by descent — if your ancestors were born there, you may be eligible. The system analyzes your tree and flags potential eligibility across 22 EU countries. It handles historical borders (like Austria-Hungary) and country-specific rules (like Luxembourg's male-line requirement). Results are categorized as "likely", "possible", or "insufficient" with explanations.

### Document Storage (Planned)

Attach documents — photos, certificates, letters — to the tree or to individual people. Organize them by category and add notes.

## Access Control

### Platform Level

New users can sign up freely and immediately create their own trees or be invited to existing ones by tree admins.

### Tree Level

Each tree has its own permissions. The owner decides who gets in and what they can do:

- **Viewers** can browse the tree and read narratives
- **Editors** can add and change data, generate narratives, and review record hints
- **Admins** can manage members, change settings, and import/export data

Members are invited by email. If they don't have an account yet, the invitation walks them through creating one.

## Issue Reporting

A small flag button is always visible so users can quickly report bugs or request features. Reports are submitted with the current page context and the reporter gets a confirmation email with a tracking link.

## Privacy and Legal

- All data is private by default — only invited members can see a tree
- The platform does not sell or share data with third parties
- Users can request deletion of their data
- AI-generated narratives come with a disclaimer about potential inaccuracies
- Users should exercise care with detailed information about living people
- Privacy policy and terms of service are maintained and updated as the platform evolves

## Design Feel

Warm and heritage-themed. Think aged paper, serif fonts for headings, earthy browns and golds. The interface should feel like opening a family archive, not using a spreadsheet. Destructive actions (deleting people, removing members) require explicit confirmation.
