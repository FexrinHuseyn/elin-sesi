const K = 3;

// Bir əlin 21 nöqtəsini "təmizləyirik":
// 1) biləyi (0-cı nöqtə) mərkəz edirik
// 2) əlin ölçüsünə bölürük
function normalizeHand(hand) {
  const wrist = hand[0];
  const middleBase = hand[9]; // orta barmağın dibi

  // əlin ölçüsü: bilək ilə orta barmağın dibi arasındakı məsafə
  const size =
    Math.hypot(middleBase.x - wrist.x, middleBase.y - wrist.y) || 1;

  return hand.flatMap(point => [
    (point.x - wrist.x) / size,
    (point.y - wrist.y) / size,
    (point.z - wrist.z) / size
  ]);
}

const HAND_SIZE = 21 * 3; // bir əl = 63 rəqəm

// Həmişə 126 rəqəmlik siyahı qaytarır (2 əl yeri)
function flattenHands(hands) {
  // əllərin sırasını sabitləyirik: şəkildə solda olan birinci
  const sorted = [...hands]
    .sort((a, b) => a[0].x - b[0].x)
    .slice(0, 2);

  const result = [];

  for (let i = 0; i < 2; i++) {
    if (sorted[i]) {
      result.push(...normalizeHand(sorted[i]));
    } else {
      // əl yoxdursa, həmin yeri sıfırla doldururuq
      result.push(...new Array(HAND_SIZE).fill(0));
    }
  }

  return result;
}

// İki rəqəm siyahısı arasındakı məsafə
function distance(a, b) {
  if (a.length !== b.length) return Infinity;

  let sum = 0;

  for (let i = 0; i < a.length; i++) {
    sum += (a[i] - b[i]) ** 2;
  }

  return Math.sqrt(sum);
}

// Dataset-ləri birləşdiririk
export async function loadDataset() {
  const files = ["uzmek", "salam"];
  const allSamples = [];

  for (const word of files) {
    const response = await fetch(`/datasets/${word}_dataset.json`);

    if (!response.ok) {
      throw new Error(`${word} dataset yüklənmədi`);
    }

    const data = await response.json();

    for (const sample of data.samples) {
      if (!sample.hands || sample.hands.length === 0) continue;

      allSamples.push({
        label: sample.label,
        features: flattenHands(sample.hands)
      });
    }
  }

  return allSamples;
}

let logCounter = 0;

// Yeni işarəni tanıyırıq
export function predictSign(hands, dataset) {
  if (!hands || hands.length === 0) return null;

  const input = flattenHands(hands);

  const neighbors = dataset
    .map(sample => ({
      label: sample.label,
      distance: distance(input, sample.features)
    }))
    .filter(item => Number.isFinite(item.distance))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, K);

  if (neighbors.length === 0) return null;

  // Hər 20 kadrdan bir konsola yazırıq (çox yazmasın deyə)
  logCounter++;
  if (logCounter % 20 === 0) {
    console.log(
      "Ən yaxın:",
      neighbors[0].label,
      "| məsafə:",
      neighbors[0].distance.toFixed(2)
    );
  }

  const votes = {};

  for (const item of neighbors) {
    votes[item.label] = (votes[item.label] || 0) + 1;
  }

  return Object.keys(votes).sort(
    (a, b) => votes[b] - votes[a]
  )[0];
}