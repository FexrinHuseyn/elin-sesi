export const WORDS = ["salam", "bos","aferin","heyecan","beyin","bakı","ana","qarabag","uzr istemek"];

const STEPS = 12;                 // hər hərəkəti 12 "ana kadra" sıxırıq
const HAND_VALUES = 21 * 3;       // bir əlin forması = 63 rəqəm
const SLOT_VALUES = HAND_VALUES + 2; // + əlin yerdəyişməsi (x, y)

// Yazılmış data [x,y,z] siyahısıdır, MediaPipe isə {x,y,z} verir.
// Hər ikisini eyni formata gətiririk.
function toPoints(hand) {
  return hand.map(p =>
    Array.isArray(p) ? { x: p[0], y: p[1], z: p[2] } : p
  );
}

// Əlin ölçüsü: bilək ilə orta barmağın dibi arasındakı məsafə
function handSize(hand) {
  return Math.hypot(hand[9].x - hand[0].x, hand[9].y - hand[0].y) || 1;
}

// Əlin formasını biləyə nisbətən və ölçüyə bölərək yazırıq
function normalizeHand(hand) {
  const wrist = hand[0];
  const size = handSize(hand);

  return hand.flatMap(p => [
    (p.x - wrist.x) / size,
    (p.y - wrist.y) / size,
    (p.z - wrist.z) / size
  ]);
}

// Bir kadrdakı əlləri 2 "yerə" bölürük (solda olan birinci)
function buildFrameSlots(hands) {
  const sorted = hands
    .map(toPoints)
    .sort((a, b) => a[0].x - b[0].x)
    .slice(0, 2);

  return [0, 1].map(i => {
    const hand = sorted[i];
    if (!hand) return null;

    return {
      shape: normalizeHand(hand),
      wx: hand[0].x,
      wy: hand[0].y,
      size: handSize(hand)
    };
  });
}

// Bir yazını (kadrlar siyahısı) sabit uzunluqlu rəqəm siyahısına çeviririk
export function sequenceToFeatures(frames) {
  const withHands = frames
    .map((f, i) => ({ f, i }))
    .filter(o => o.f.hands.length > 0);

  // Çox az kadrda əl görünübsə, istifadə etmirik
  if (withHands.length < 3) return null;

  // Yalnız əlin göründüyü hissəni götürürük (başlanğıc/son boşluğu atırıq)
  const first = withHands[0].i;
  const last = withHands[withHands.length - 1].i;

  const slotsPerFrame = [];
  let prev = null;

  for (let i = first; i <= last; i++) {
    const hands = frames[i].hands;
    if (hands.length > 0) prev = buildFrameSlots(hands);
    // Əl bir anlıq itibsə, əvvəlki kadrı təkrar edirik
    slotsPerFrame.push(prev);
  }

  // Hər əl yeri üçün başlanğıc nöqtəsi (yerdəyişməni ondan ölçürük)
  const origins = [null, null];

  for (const slots of slotsPerFrame) {
    for (let s = 0; s < 2; s++) {
      if (!origins[s] && slots[s]) {
        origins[s] = { x: slots[s].wx, y: slots[s].wy, size: slots[s].size };
      }
    }
  }

  const n = slotsPerFrame.length;
  const features = [];

  for (let t = 0; t < STEPS; t++) {
    const idx = Math.round((t * (n - 1)) / (STEPS - 1));
    const slots = slotsPerFrame[idx];

    for (let s = 0; s < 2; s++) {
      const slot = slots[s];

      if (!slot) {
        features.push(...new Array(SLOT_VALUES).fill(0));
        continue;
      }

      features.push(...slot.shape);
      features.push(
        (slot.wx - origins[s].x) / origins[s].size,
        (slot.wy - origins[s].y) / origins[s].size
      );
    }
  }

  return features;
}

function distance(a, b) {
  if (a.length !== b.length) return Infinity;

  let sum = 0;

  for (let i = 0; i < a.length; i++) {
    sum += (a[i] - b[i]) ** 2;
  }

  return Math.sqrt(sum);
}

// KNN: ən yaxın K nümunəyə baxıb səsvermə edir
export function knnPredict(features, samples, k = 3) {
  const neighbors = samples
    .map(s => ({ label: s.label, distance: distance(features, s.features) }))
    .filter(n => Number.isFinite(n.distance))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, k);

  if (neighbors.length === 0) return null;

  const votes = {};

  for (const n of neighbors) {
    votes[n.label] = (votes[n.label] || 0) + 1;
  }

  const label = Object.keys(votes).sort((a, b) => votes[b] - votes[a])[0];

  return {
    label,
    nearestDistance: neighbors[0].distance,
    agreement: votes[label] / neighbors.length
  };
}

// 3 sinfin yazılarını yükləyirik
export async function loadRecordings() {
  const result = [];

  for (const word of WORDS) {
    const url = `/datasets/${word}_recordings.json`;

    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(
          `${url} tapılmadı. Status: ${response.status}`
        );
      }

      const text = await response.text();

      let data;

      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(
          `${url} JSON deyil. Server HTML qaytarır.`
        );
      }

      if (!data.recordings || !Array.isArray(data.recordings)) {
        throw new Error(`${url} daxilində recordings array yoxdur.`);
      }

      console.log(word, "nümunə sayı:", data.recordings.length);

      data.recordings.forEach((rec, index) => {
        const features = sequenceToFeatures(rec.frames);

        if (features) {
          result.push({ label: word, index, features });
        }
      });

    } catch (error) {
      console.error("Dataset yükləmə xətası:", error);
      throw error;
    }
  }

  return result;
}