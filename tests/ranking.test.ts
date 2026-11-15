import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generalRankingQuerySchema } from '../src/lib/validations';
import { parsePdfText, sortRanking } from '../src/lib/ranking-logic';

test('rejects malformed pagination and ranking identifiers', () => {
  for (const value of ['abc', '1junk', '-1', '0', '1.5', '9007199254740992']) {
    for (const key of ['rankingId', 'page', 'limit']) {
      assert.equal(generalRankingQuerySchema.safeParse({ [key]: value }).success, false);
    }
  }
  assert.deepEqual(generalRankingQuerySchema.parse({}), { page: 1, limit: 100, rankingId: null });
});
test('orders points and positive, zero, negative tie breakers without mutating input', () => {
  const rows = [ {total_points: 3,t1: -11}, {total_points: 3,t1: 0}, {total_points: 3,t1: 5}, {total_points: 4,t1: -20}, {total_points: 3,t1: -2} ];
  assert.deepEqual(sortRanking(rows).map(p => p.t1), [-20,5,0,-2,-11]);
  assert.equal(rows[0].t1,-11);
});
test('parses tournament results and ignores headers', () => {
  const rows = parsePdfText('Classifiche\n1 Rossi, Mario 4 +6 +5 0\n2 Bianchi, Anna 3 -2 0 0');
  assert.equal(rows.length,2);
  assert.equal(rows[0].score,4);
  assert.equal(rows[1].t1,-2);
  assert.deepEqual(parsePdfText('invalid document'),[]);
});
