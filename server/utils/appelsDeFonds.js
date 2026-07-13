// Calcule dateEmission/dateLimiteReglement/dateReglement d'un appel de
// fonds au moment où sa phase est constatée (attestation MOE) pour un lot
// donné. Partagé entre deux points d'entrée : la génération d'un nouveau
// lot Acté quand une de ses phases a déjà été attestée ailleurs dans le
// programme (`genererAppelsDeFonds`, routes/lots.js), et l'attestation en
// masse appliquée à des lots déjà Actés (`emettreAttestation`,
// routes/appelsDeFonds.js).
//
// Règle métier (13/07/2026) : si l'acte du lot a été signé après (ou le
// jour même) que cette phase ait été constatée, l'appel est déjà dû à ce
// moment-là — le notaire encaisse les sommes déjà échues au moment de la
// signature, l'appel ne reste jamais "en attente" pour ce lot. Sinon (cas
// normal : le lot a été Acté avant que cette phase ne soit constatée),
// l'appel suit le circuit habituel : émis à l'instant du traitement, en
// attente d'un règlement saisi plus tard.
export function calculerEmissionAppel(lot, dateAttestation, delaiJours) {
  const dejaDu = lot.dateActe && new Date(lot.dateActe) >= new Date(dateAttestation)
  const dateEmission = dejaDu ? new Date(lot.dateActe) : new Date()
  const dateLimiteReglement = new Date(dateEmission)
  dateLimiteReglement.setDate(dateLimiteReglement.getDate() + delaiJours)

  return {
    dateEmission,
    dateLimiteReglement,
    dateReglement: dejaDu ? new Date(lot.dateActe) : null,
  }
}
