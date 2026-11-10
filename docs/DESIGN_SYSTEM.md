# Design system (planned)

Target: Persian-speaking clinic staff in Iran, using desktop reception/administration workflows and mobile/tablet in clinic. Primary locale `fa-IR`, RTL first; Latin names, phone numbers, IDs, and money need isolated LTR formatting. Business timezone: `Asia/Tehran`. Display calendar: Jalali.

Initial tokens from product brief: primary #145C50; secondary #C7A66A; background #F6F7F5; surface #FFFFFF; text #202724; muted #78817C; border #E5EAE6. Persian typeface: Vazirmatn; Latin: Inter. These are proposed tokens and must map to a single runtime token source when the UI is built.

Accessibility target: WCAG 2.2 AA, semantic controls, visible focus, keyboard support, readable Persian content, sufficient contrast, responsive layouts, and clear loading/error/empty feedback. No runtime UI exists yet.
