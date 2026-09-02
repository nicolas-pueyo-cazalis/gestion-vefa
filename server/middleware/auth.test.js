import { describe, it, expect, vi, beforeAll } from 'vitest'
import jwt from 'jsonwebtoken'
import { verifierToken, autoriserRoles } from './auth.js'

const SECRET_TEST = 'secret-de-test-01092026'

beforeAll(() => {
  process.env.JWT_SECRET = SECRET_TEST
})

function creerRes() {
  const res = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  return res
}

describe('verifierToken', () => {
  it('renvoie 401 "Connexion requise" si aucun en-tête Authorization n\'est fourni', () => {
    const req = { headers: {} }
    const res = creerRes()
    const next = vi.fn()

    verifierToken(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ message: 'Connexion requise' })
    expect(next).not.toHaveBeenCalled()
  })

  it('traite un en-tête sans le préfixe "Bearer " comme un jeton absent', () => {
    const req = { headers: { authorization: 'un-jeton-sans-bearer' } }
    const res = creerRes()
    const next = vi.fn()

    verifierToken(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('pose req.utilisateur et appelle next() avec un jeton valide', () => {
    const jeton = jwt.sign({ id: '507f1f77bcf86cd799439011', role: 'gestionnaire' }, SECRET_TEST)
    const req = { headers: { authorization: `Bearer ${jeton}` } }
    const res = creerRes()
    const next = vi.fn()

    verifierToken(req, res, next)

    expect(req.utilisateur).toMatchObject({ id: '507f1f77bcf86cd799439011', role: 'gestionnaire' })
    expect(next).toHaveBeenCalledOnce()
    expect(res.status).not.toHaveBeenCalled()
  })

  it('renvoie 401 si le jeton est signé avec un autre secret', () => {
    const jeton = jwt.sign({ id: '1', role: 'admin' }, 'un-autre-secret')
    const req = { headers: { authorization: `Bearer ${jeton}` } }
    const res = creerRes()
    const next = vi.fn()

    verifierToken(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({
      message: 'Session expirée ou invalide, reconnectez-vous',
    })
    expect(next).not.toHaveBeenCalled()
  })

  it('renvoie 401 si le jeton est expiré', () => {
    const jeton = jwt.sign({ id: '1', role: 'admin' }, SECRET_TEST, { expiresIn: '-1s' })
    const req = { headers: { authorization: `Bearer ${jeton}` } }
    const res = creerRes()
    const next = vi.fn()

    verifierToken(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('renvoie 401 si le jeton est syntaxiquement invalide (pas un JWT)', () => {
    const req = { headers: { authorization: 'Bearer ceci-nest-pas-un-jwt' } }
    const res = creerRes()
    const next = vi.fn()

    verifierToken(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })
})

describe('autoriserRoles', () => {
  it("appelle next() si le rôle de l'utilisateur fait partie des rôles autorisés", () => {
    const req = { utilisateur: { role: 'admin' } }
    const res = creerRes()
    const next = vi.fn()

    autoriserRoles('admin', 'gestionnaire')(req, res, next)

    expect(next).toHaveBeenCalledOnce()
    expect(res.status).not.toHaveBeenCalled()
  })

  it("accepte n'importe lequel des rôles listés, pas seulement le premier", () => {
    const req = { utilisateur: { role: 'gestionnaire' } }
    const res = creerRes()
    const next = vi.fn()

    autoriserRoles('admin', 'gestionnaire')(req, res, next)

    expect(next).toHaveBeenCalledOnce()
  })

  it("renvoie 403 si le rôle de l'utilisateur n'est pas autorisé", () => {
    const req = { utilisateur: { role: 'lecture' } }
    const res = creerRes()
    const next = vi.fn()

    autoriserRoles('admin', 'gestionnaire')(req, res, next)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith({ message: 'Action réservée à un rôle supérieur' })
    expect(next).not.toHaveBeenCalled()
  })

  it('renvoie toujours 403 si appelé sans aucun rôle autorisé', () => {
    const req = { utilisateur: { role: 'admin' } }
    const res = creerRes()
    const next = vi.fn()

    autoriserRoles()(req, res, next)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(next).not.toHaveBeenCalled()
  })
})
