/**
 * What each axis *is*, and how to perceive it.
 *
 * The line these must not cross: defining an axis is teaching, but naming what
 * a given wine should measure on it is anchoring, and anchoring is the failure
 * this whole app exists to prevent. So none of this copy refers to a grape, a
 * region, a style, or a typical value. "Tannin is a drying grip" is fine.
 * "Nebbiolo is high tannin" belongs in the explanation, after you've written
 * your note — never on the taste screen.
 *
 * Each entry also names the confusion it's most often mistaken for, because
 * that's the part that actually costs you a call.
 */
export const AXIS_INFO: Record<string, string> = {
  nose_intensity:
    "How much the wine gives off before you work at it. Hold the glass still at chest height — if you're already getting something, that's high. If you have to put your nose in and swirl to find anything, that's low. This is volume, not quality.",

  sweetness:
    "Actual sugar left in the wine, which is not the same as fruitiness. A wine can taste loudly of ripe peach and still be bone dry. Judge it on the tip of your tongue, and check whether sweetness lingers after you swallow or whether it was just fruit.",

  acidity:
    'What makes your mouth water. Take a sip, swallow, and notice how much saliva pools under your tongue — a lot, fast, means high. Acidity reads as freshness or tartness. It is the thing that makes a wine feel lively rather than flabby.',

  tannin:
    'The drying, grippy feeling on your gums and the inside of your cheeks, like over-steeped black tea. It is a texture, not a flavour. It comes from skins, seeds and oak. Easy to confuse with bitterness, and with acidity — tannin dries, acid waters.',

  body:
    'The weight of the wine in your mouth. Skim milk, whole milk, cream. Driven mostly by alcohol, sugar and extract. Weight and freshness are separate things — a wine can feel full and still be sharply acidic.',

  alcohol:
    'Warmth at the back of your throat after you swallow, and a slight burn if it is high. Breathe out gently through your mouth afterwards; heat on the exhale is the giveaway. High alcohol also pushes the body up.',

  finish:
    'How long the flavour keeps going after you swallow. Actually count the seconds. Length is the thing here, not intensity — a quiet flavour that hangs around for half a minute is a long finish.',
}

export const WORD_INFO =
  "Whatever you actually smell or taste, in your own words. These are never scored. The app reflects them back and groups them, and that's all — 'green apple' is not right or wrong, and nothing here is going to tell you that you missed one."
