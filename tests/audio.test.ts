import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ambientDiff, parseYouTubeId } from '../src/web/audio/helpers'

test('parseYouTubeId', () => {
  const id = 'dQw4w9WgXcQ'
  for (const u of [`https://www.youtube.com/watch?v=${id}&t=3`, `https://youtu.be/${id}?si=x`, `https://youtube.com/shorts/${id}`, `https://www.youtube.com/embed/${id}`, id])
    assert.equal(parseYouTubeId(u), id)
  assert.equal(parseYouTubeId('https://example.com/watch?v=' + id), null)
  assert.equal(parseYouTubeId('lixo'), null)
})

test('ambientDiff', () => {
  const d = ambientDiff([1, 2], [{ id: 2, volume: 0.3 }, { id: 3, volume: 0.5 }, { id: 99, volume: 1 }], new Set([1, 2, 3]))
  assert.deepEqual(d, { stop: [1], start: [{ id: 3, volume: 0.5 }], update: [{ id: 2, volume: 0.3 }] })
})
