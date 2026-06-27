const fs = require('fs');

const designMd = `# VAULT Design System

## SECTION 1: COLOR SYSTEM — VAULT PALETTE
--vault-bg-primary:    #F7F6F3    /* Warm parchment — main app background */
--vault-bg-secondary:  #EFEDE8    /* Slightly deeper warm — sidebar, panels */
--vault-bg-card:       #FFFFFF    /* Pure white reserved ONLY for card surfaces — creates lift */
--vault-bg-input:      #FAF9F7    /* Input field background */
--vault-border:        #E8E4DC    /* Warm gray border */
--vault-border-strong: #D4CFC5    /* Emphasized borders, dividers */

--vault-text-primary:  #1C1917    /* Stone-950 variant — main body text */
--vault-text-secondary:#57534E    /* Stone-600 — descriptions, metadata */
--vault-text-muted:    #A8A29E    /* Stone-400 — placeholders, disabled */
--vault-text-inverse:  #F7F6F3    /* On dark surfaces */

--vault-shadow-sm:     0 1px 3px rgba(28, 25, 23, 0.06), 0 1px 2px rgba(28, 25, 23, 0.04);
--vault-shadow-md:     0 4px 16px rgba(28, 25, 23, 0.08), 0 2px 6px rgba(28, 25, 23, 0.05);
--vault-shadow-lg:     0 12px 40px rgba(28, 25, 23, 0.10), 0 4px 12px rgba(28, 25, 23, 0.06);
--vault-shadow-card:   0 2px 8px rgba(28, 25, 23, 0.07);

### Role-Differentiated Chrome System
**ADMIN CHROME — "Midnight Indigo"**
--admin-accent:        #4338CA
--admin-accent-light:  #EEF2FF
--admin-accent-mid:    #6366F1
--admin-accent-dark:   #312E81
--admin-header-stripe: linear-gradient(135deg, #4338CA 0%, #6366F1 100%);

**CUSTOMER CHROME — "Ocean Slate"**
--customer-accent:     #0369A1
--customer-accent-light:#F0F9FF
--customer-accent-mid: #0EA5E9
--customer-accent-dark:#075985
--customer-header-stripe: linear-gradient(135deg, #0369A1 0%, #0EA5E9 100%);

**STAFF / OPERATIONS CHROME — "Sage Teal"**
--staff-accent:        #0D9488
--staff-accent-light:  #F0FDFA
--staff-accent-mid:    #14B8A6
--staff-accent-dark:   #0F766E
--staff-header-stripe: linear-gradient(135deg, #0D9488 0%, #14B8A6 100%);

### Status Semantic Tokens
--vault-success:       #15803D
--vault-success-bg:    #F0FDF4
--vault-warning:       #B45309
--vault-warning-bg:    #FFFBEB
--vault-error:         #B91C1C
--vault-error-bg:      #FEF2F2
--vault-info:          #1D4ED8
--vault-info-bg:       #EFF6FF

## SECTION 2: TYPOGRAPHY SYSTEM
Primary Typeface: "Plus Jakarta Sans"
Import: https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap
Data/Monospace Typeface: "JetBrains Mono"
Import: https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap

--font-display-xl:     clamp(2.5rem, 5vw, 4rem);     font-weight: 800; letter-spacing: -0.03em; line-height: 1.1;
--font-display-lg:     clamp(1.875rem, 4vw, 2.75rem); font-weight: 700; letter-spacing: -0.025em; line-height: 1.15;
--font-heading-md:     1.5rem;    font-weight: 700;  letter-spacing: -0.02em; line-height: 1.25;
--font-heading-sm:     1.25rem;   font-weight: 600;  letter-spacing: -0.015em; line-height: 1.3;
--font-body-lg:        1.0625rem; font-weight: 400;  letter-spacing: -0.01em; line-height: 1.6;
--font-body-md:        0.9375rem; font-weight: 400;  letter-spacing: -0.005em; line-height: 1.6;
--font-label:          0.8125rem; font-weight: 600;  letter-spacing: 0.04em;  text-transform: uppercase;
--font-mono-data:      0.875rem;  font-weight: 500;  letter-spacing: 0.01em;  font-family: 'JetBrains Mono';

## SECTION 3: SPACING, BORDER RADIUS & GRID
--vault-radius-sm:     8px
--vault-radius-md:     12px
--vault-radius-lg:     16px
--vault-radius-xl:     24px
--vault-radius-2xl:    32px
--vault-radius-full:   9999px

## SECTION 4: ANIMATION SYSTEM — THE VAULT MOTION LANGUAGE
--ease-vault-enter:    cubic-bezier(0.16, 1, 0.3, 1);
--ease-vault-exit:     cubic-bezier(0.4, 0, 1, 1);
--ease-vault-spring:   cubic-bezier(0.34, 1.56, 0.64, 1);
--ease-vault-smooth:   cubic-bezier(0.25, 0.46, 0.45, 0.94);
`;

const base64 = Buffer.from(designMd).toString('base64');
console.log(base64);
fs.writeFileSync('C:\\Users\\Gauri\\.gemini\\antigravity-ide\\brain\\34cefa45-8951-419b-ad74-f8193d27b3c5\\scratch\\base64.txt', base64);
