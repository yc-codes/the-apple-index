import {test} from 'node:test';
import assert from 'node:assert/strict';
import {changePreferences,readState,stateUrl} from '../src/state.js';
const products=[{id:'macbook-air',variants:[{id:'512gb'},{id:'1tb'}]}];
const countries=[{code:'us'},{code:'in'},{code:'jp'}];
test('country and currency changes preserve the exact nondefault variant',()=>{
 const selected=readState('https://example.com/products/macbook-air/1tb?country=us&currency=USD',{},products,countries);
 const changed=changePreferences(changePreferences(selected,{country:'in'}),{currency:'JPY'});
 assert.equal(changed.variant,'1tb');assert.equal(changed.product,'macbook-air');assert.equal(changed.country,'in');assert.equal(changed.currency,'JPY');
 assert.deepEqual(readState('https://example.com'+stateUrl(changed),{},products,countries),changed);
});
test('explicit URL preferences win over persisted preferences',()=>{
 const s=readState('https://example.com/products/macbook-air/1tb?country=jp&currency=JPY',{country:'in',currency:'INR'},products,countries);
 assert.equal(s.country,'jp');assert.equal(s.currency,'JPY');assert.equal(s.variant,'1tb');
});
test('invalid variants and preferences fall back safely',()=>{
 const s=readState('https://example.com/products/macbook-air/missing?country=unknown&currency=BAD',{},products,countries);
 assert.equal(s.variant,'512gb');assert.equal(s.country,'us');assert.equal(s.currency,'USD');
});
test('listing reload restores preferences without introducing a product',()=>{
 const s=readState('https://example.com/',{country:'in',currency:'INR'},products,countries);
 assert.equal(s.product,null);assert.equal(s.country,'in');assert.equal(s.currency,'INR');
});
