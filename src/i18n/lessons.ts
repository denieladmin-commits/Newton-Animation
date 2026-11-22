/** Texts for the four guided lessons (Felfedező mód). Numbers are filled in from the simulation. */
import type { Lang } from './format';

export interface LessonText {
  title: string;
  intro: string;
  question: string;
  options: [string, string, string];
  right: string;
  wrong: string;
  task: string;
  hint: string;
}

export const LESSON_UI: Record<
  Lang,
  { setup: string; predict: string; yourTask: string; notYet: string; solved: string; reset: string; progress: (n: number) => string }
> = {
  hu: {
    setup: 'Állítsd be nekem',
    predict: 'Jósold meg!',
    yourTask: 'Feladat',
    notYet: 'Még nem teljesült.',
    solved: 'Teljesítve',
    reset: 'Haladás törlése',
    progress: (n) => `${n} / 4 feladat kész`,
  },
  en: {
    setup: 'Set it up for me',
    predict: 'Predict first',
    yourTask: 'Your task',
    notYet: 'Not done yet.',
    solved: 'Done',
    reset: 'Reset progress',
    progress: (n) => `${n} of 4 tasks done`,
  },
};

export const LESSONS: Record<Lang, [LessonText, LessonText, LessonText, LessonText]> = {
  hu: [
    {
      title: 'Hová esik a golyó?',
      intro: 'Newton ágyúja egy 400 km magas hegyen áll. Ha a golyó nem elég gyors, visszaesik a bolygóra – de hová?',
      question: 'Ha 4 km/s-mal lövünk vízszintesen, hol ér földet a golyó?',
      options: ['A hegy lábánál, néhány km-re', 'Kb. 1400 km-re', 'A bolygó túloldalán'],
      right: 'Pontosan: 1382 km-re csapódik be (Kepler-pályával számolva ugyanennyi).',
      wrong: 'Nem egészen: lőj, és nézd meg a bal felső sarokban, milyen messze csapódott be.',
      task: 'Állítsd be úgy a kezdősebességet, hogy a golyó legalább 5000 km-re érjen földet!',
      hint: 'Tipp: a +100 gombbal lépésenként növeld v₀-t, és hasonlítsd össze a lövéseket (A, B, C…).',
    },
    {
      title: '8 km alatt 5 m: miért nem ér földet?',
      intro: 'Ez Newton legfontosabb gondolata. A golyó minden pillanatban esik, mint egy elejtett kő. Akkor miért nem csapódik be soha?',
      question: 'Mennyit esik a golyó az első másodpercben, ha 7,9 km/s-mal vízszintesen lőjük ki?',
      options: ['Semennyit, hiszen vízszintesen lőttük', 'Kb. 5 métert, mint egy elejtett kő', 'Kb. 50 métert'],
      right: 'Így van: a gravitáció ugyanúgy hat rá, mint egy elejtett kőre, ezért az első másodpercben ½·g·t² ≈ 4,9 m-t esik.',
      wrong: 'Nem: a vízszintes sebesség nem változtat azon, hogy a golyó ugyanúgy esik, mint egy elejtett kő (½·g·t² ≈ 4,9 m).',
      task: 'Lőj v₁ sebességgel valós időben (1×), és figyeld az első másodpercet!',
      hint: 'A beállítás után a kép az ágyúra közelít és követi a golyót.',
    },
    {
      title: 'Körpálya',
      intro: 'Ha a golyó pont olyan gyors, hogy esés közben a felszín ugyanannyit görbül el alatta, akkor soha nem ér földet: körpályán kering.',
      question: 'Körpályán mekkora szöget zár be a sebesség és a gravitációs erő?',
      options: ['0°: párhuzamosak', '90°: merőlegesek', '180°: ellentétesek'],
      right: 'Igen, végig merőlegesek. Ezért az erő csak a sebesség irányát változtatja, a nagyságát nem.',
      wrong: 'Figyeld meg a nyilakat: körpályán a derékszög jele végig látszik a golyónál.',
      task: 'Keresd meg azt a kezdősebességet, amellyel a golyó körpályán kering, és várd meg, amíg megtesz egy kört!',
      hint: 'Tipp: a derékszög jele csak akkor marad végig látható, ha a pálya kör. Vagy nyomd meg a v₁ gombot.',
    },
    {
      title: 'Ellipszis és szökés',
      intro: 'Mi történik, ha v₁-nél gyorsabban lövünk? A golyó távolodni kezd, de a gravitáció visszahúzza – egészen addig, amíg el nem ér egy határsebességet.',
      question: 'Melyik sebességnél lesz a teljes energia (E) éppen nulla?',
      options: ['v₁-nél', 'v₂ = √2 · v₁-nél', '2 · v₁-nél'],
      right: 'Így van: v₂ = √2 · v₁. Itt ½mv² éppen egyenlő G·Mm/r-rel, ezért E = 0.',
      wrong: 'Nézd meg a Képletek fül energia-részét: E = ½mv² − G·Mm/r. Mikor nulla?',
      task: 'Növeld lépésenként a kezdősebességet v₁ fölé, figyeld az ellipszisek alakját és E előjelét, majd lőj ki egy golyót, amely elszökik!',
      hint: 'Tipp: a Vezérlés fül energiasávjain figyeld, mikor lesz E pozitív.',
    },
  ],
  en: [
    {
      title: 'Where does the ball land?',
      intro: "Newton's cannon stands on a 400 km high mountain. If the ball is not fast enough, it falls back – but where?",
      question: 'Fired horizontally at 4 km/s, where does the ball land?',
      options: ['At the foot of the mountain, a few km away', 'About 1400 km away', 'On the far side of the planet'],
      right: 'Exactly: it lands 1382 km away (the Kepler orbit gives the same).',
      wrong: 'Not quite: fire, and read the distance in the top-left box.',
      task: 'Set the launch speed so that the ball lands at least 5000 km away!',
      hint: 'Tip: raise v₀ step by step with +100 and compare the shots (A, B, C…).',
    },
    {
      title: '5 m in 8 km: why does it never land?',
      intro: "Newton's key idea. The ball is falling all the time, like a dropped stone. So why does it never hit the ground?",
      question: 'Fired horizontally at 7.9 km/s, how far does the ball fall in the first second?',
      options: ['Not at all – it was fired horizontally', 'About 5 m, like a dropped stone', 'About 50 m'],
      right: 'Right: gravity acts on it just like on a dropped stone, so in the first second it falls ½·g·t² ≈ 4.9 m.',
      wrong: 'No: the horizontal speed does not stop the ball falling like a dropped stone (½·g·t² ≈ 4.9 m).',
      task: 'Fire at v₁ in real time (1×) and watch the first second!',
      hint: 'After setting up, the view zooms to the cannon and follows the ball.',
    },
    {
      title: 'Circular orbit',
      intro: 'If the ball is just fast enough that the surface curves away beneath it as much as it falls, it never lands: it is in a circular orbit.',
      question: 'On a circular orbit, what is the angle between the velocity and the gravitational force?',
      options: ['0°: parallel', '90°: perpendicular', '180°: opposite'],
      right: 'Yes, always perpendicular. So the force only turns the velocity; it never speeds the ball up or slows it down.',
      wrong: 'Watch the arrows: on a circular orbit the right-angle mark stays on the whole time.',
      task: 'Find the launch speed that gives a circular orbit, and wait for one full revolution!',
      hint: 'Tip: the right-angle mark stays visible only if the path is a circle. Or press the v₁ button.',
    },
    {
      title: 'Ellipse and escape',
      intro: 'What happens if we fire faster than v₁? The ball starts to rise, but gravity pulls it back – until it reaches a limiting speed.',
      question: 'At which speed is the total energy (E) exactly zero?',
      options: ['At v₁', 'At v₂ = √2 · v₁', 'At 2 · v₁'],
      right: 'Right: v₂ = √2 · v₁. There ½mv² equals G·Mm/r exactly, so E = 0.',
      wrong: 'Look at the energy part of the Formulas tab: E = ½mv² − G·Mm/r. When is it zero?',
      task: 'Raise the launch speed above v₁ step by step, watch the ellipses and the sign of E, then fire a ball that escapes!',
      hint: 'Tip: on the Controls tab, watch the energy bars to see when E turns positive.',
    },
  ],
};

/** Success messages with the student's own numbers. */
export const LESSON_DONE: Record<
  Lang,
  {
    range: (km: string) => string;
    curvature: (x: string, drop: string, curve: string) => string;
    circle: (v0: string, T: string, Tk: string) => string;
    escape: (v0: string, v2: string) => string;
    insetBall: (m: string) => string;
    insetSurface: (m: string) => string;
    insetScale: (k: string) => string;
  }
> = {
  hu: {
    range: (km) => `A golyó ${km} km-re ért földet. Minél gyorsabb, annál messzebb jut – amíg el nem éri v₁-et, akkor már soha nem ér földet.`,
    curvature: (x, drop, curve) =>
      `Az első másodpercben a golyó ${x} km-t haladt előre és ${drop} m-t esett. Ugyanekkora úton a felszín ${curve} m-rel görbül el alatta. A golyó tehát folyamatosan esik, de a talaj ugyanannyival „elfordul” alóla: ezért nem ér földet soha.`,
    circle: (v0, T, Tk) => `Körpálya v₀ = ${v0} km/s-mal (≈ v₁). Mért keringési idő: ${T}. Kepler III. törvénye szerint: ${Tk}.`,
    escape: (v0, v2) => `Elszökött! v₀ = ${v0} km/s, ami eléri a v₂ = ${v2} km/s-ot, ezért E ≥ 0: a golyó soha nem tér vissza.`,
    insetBall: (m) => `a golyó esése: ${m} m`,
    insetSurface: (m) => `a felszín görbülete: ${m} m`,
    insetScale: (k) => `függőlegesen ${k}× nagyítva`,
  },
  en: {
    range: (km) => `The ball landed ${km} km away. The faster it goes, the farther it gets – until it reaches v₁; then it never lands.`,
    curvature: (x, drop, curve) =>
      `In the first second the ball moved ${x} km forward and fell ${drop} m. Over that distance the surface curves away beneath it by ${curve} m. So the ball keeps falling, but the ground curves away just as much: that is why it never lands.`,
    circle: (v0, T, Tk) => `Circular orbit at v₀ = ${v0} km/s (≈ v₁). Measured period: ${T}. Kepler's third law gives: ${Tk}.`,
    escape: (v0, v2) => `It escaped! v₀ = ${v0} km/s reaches v₂ = ${v2} km/s, so E ≥ 0: the ball never comes back.`,
    insetBall: (m) => `ball's drop: ${m} m`,
    insetSurface: (m) => `surface curvature: ${m} m`,
    insetScale: (k) => `vertical scale ×${k}`,
  },
};
