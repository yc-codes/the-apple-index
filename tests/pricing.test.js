import {test} from 'node:test';
import assert from 'node:assert/strict';
import {effectiveLocal,rankPrices,taxNote} from '../src/pricing.js';
import {stores,storeByCode} from '../server/stores.js';
test('US prices add estimated sales tax; VAT countries deduct the tourist refund only when asked',()=>{
 assert.equal(Math.round(effectiveLocal({local:1999},storeByCode.us)),2159);
 assert.equal(effectiveLocal({local:1000},storeByCode.de,{refund:false}),1000);
 assert.equal(Math.round(effectiveLocal({local:1000},storeByCode.de)),850);
 assert.match(taxNote(storeByCode.de),/19% MwSt · −15% tourist refund/);
 assert.equal(taxNote(storeByCode.hk),'No sales tax');
});
test('rows rank by comparable USD price and skip currencies without a rate',()=>{
 const rows=rankPrices({prices:[{code:'us',local:1000},{code:'jp',local:100000},{code:'de',local:1000}]},storeByCode,{USD:1,JPY:150},{refund:true});
 assert.deepEqual(rows.map(r=>r.code),['jp','us']);
});
test('every store has a currency and a known Apple store path',()=>{
 for(const s of stores){assert.match(s.currency,/^[A-Z]{3}$/);assert.equal(typeof s.store,'string');}
 assert.equal(storeByCode.gb.store,'uk');assert.equal(storeByCode.us.store,'');
});
