import { describe, expect, it } from 'vitest'
import {
  base64Decode,
  base64Encode,
  caesarCandidates,
  caesarShift,
  letterFrequency,
  sha256Hex,
  shannonEntropy,
  vigenereTransform,
} from './crypto'

describe('SHA-256', () => {
  it('confere vetores conhecidos', () => {
    expect(sha256Hex('')).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    )
    expect(sha256Hex('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    )
    expect(sha256Hex('A integridade sustenta a conclusão')).toHaveLength(64)
  })

  it('produz hashes diferentes para entradas diferentes', () => {
    expect(sha256Hex('evidência A')).not.toBe(sha256Hex('evidência B'))
  })
})

describe('Base64, César e Vigenère', () => {
  it('faz round-trip de Base64 com acentos e quebras de linha', () => {
    const text = 'Evidência sintética: integridade não é autenticidade.\nFim.'
    expect(base64Decode(base64Encode(text))).toBe(text)
    expect(base64Encode('')).toBe('')
    expect(base64Decode('')).toBe('')
  })

  it('rejeita Base64 inválido', () => {
    expect(() => base64Decode('%%%')).toThrow('Base64')
    expect(() => base64Decode('a')).toThrow('Base64')
  })

  it('desloca apenas letras e preserva caixa, espaços e pontuação', () => {
    expect(caesarShift('abc XYZ', 3)).toBe('def ABC')
    expect(caesarShift('Ataque ao Portal!', 11)).toBe('Lelbfp lz Azcelw!')
    expect(caesarShift(caesarShift('Texto com acentuação', 7), -7)).toBe('Texto com acentuação')
    expect(caesarCandidates('Dwwdfn').find((candidate) => candidate.shift === 3)?.text).toBe(
      'Attack',
    )
  })

  it('cifra e decifra Vigenère simetricamente', () => {
    const cipher = vigenereTransform('A integridade sustenta a conclusão', 'PERICIA', 1)
    expect(cipher).not.toBe('A integridade sustenta a conclusão')
    expect(vigenereTransform(cipher, 'PERICIA', -1)).toBe('A integridade sustenta a conclusão')
    expect(() => vigenereTransform('texto', '123', 1)).toThrow('Vigenère')
  })

  it('resolve a camada do laboratório: Base64 externo + César 11', () => {
    const plaintext = 'A integridade sustenta a conclusão'
    const encoded = base64Encode(caesarShift(plaintext, 11))
    expect(caesarShift(base64Decode(encoded), -11)).toBe(plaintext)
  })

  it('calcula frequência e entropia de forma determinística', () => {
    const frequency = letterFrequency('AAB! C')
    expect(frequency[0]).toMatchObject({ letter: 'A', count: 2 })
    expect(frequency.find((item) => item.letter === 'B')?.count).toBe(1)
    expect(frequency.map((item) => item.letter)).not.toContain('!')
    expect(shannonEntropy('')).toBe(0)
    expect(shannonEntropy('aaaa')).toBe(0)
    expect(shannonEntropy('ab')).toBeCloseTo(1)
  })
})
