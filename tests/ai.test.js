import test from 'node:test'
import assert from 'node:assert/strict'
import { aiContext, validateSuggestion, appendSuggestedActivities, validateModelSuggestion } from '../src/utils/aiSuggestions.js'

test('AI receives only bounded scope and calculated context, not identity or documents', () => {
  const context = aiContext({ clientName: 'Private client', cpfCnpj: 'secret', attachments: [{data:'private'}], notes: 'not selected', category:'vídeo', activities:[{name:'Captação',quantity:2,unitValue:100}], taxes:0 }, {fullName:'Private professional', area:'vídeo'}, 'Video for a cafe')
  const serialized = JSON.stringify(context)
  assert.equal(serialized.includes('Private'),false)
  assert.equal(serialized.includes('secret'),false)
  assert.equal(serialized.includes('private'),false)
  assert.equal(context.description,'Video for a cafe')
  assert.equal(context.profitabilityKnown,false)
  assert.equal(aiContext({}, {}, 'a'.repeat(2000)).description.length,1500)
})
test('AI suggestions cannot set financial or executable fields', () => {
  const result = validateSuggestion({summary:'Teste',activities:[{name:'Planejamento',hours:1,unitValue:999}],questions:[],observations:[],taxes:99,price:0,html:'<script>bad</script>'})
  assert.deepEqual(Object.keys(result),['summary','activities','questions','observations'])
  assert.deepEqual(result.activities,[{name:'Planejamento',hours:1}])
  for (const hours of [-1, Infinity, 201, '5']) assert.throws(()=>validateSuggestion({...result,activities:[{name:'Work',hours}]}))
  assert.throws(()=>validateSuggestion({...result,questions:[{}]}))
  assert.throws(()=>validateSuggestion({...result,activities:Array(9).fill({name:'Work',hours:1})}))
})
test('only reviewed activities are appended; existing work and pricing stay intact', () => {
  const budget={activities:[{id:'old',name:'Captação',quantity:2,unitValue:150}],taxes:6,discount:20,clientId:'client',contractSettings:{status:'draft'}}
  const next=appendSuggestedActivities(budget,[{name:'Edição',hours:3}],120,()=> 'new')
  assert.deepEqual(next.activities[0],budget.activities[0])
  assert.deepEqual(next.activities[1],{id:'new',name:'Edição',quantity:3,unitValue:120})
  assert.equal(next.taxes,6); assert.equal(next.discount,20); assert.equal(next.clientId,'client')
  assert.deepEqual(next.contractSettings,budget.contractSettings)
  assert.equal(budget.activities.length,1)
})

test('model output cannot invent hours or activities outside the supported list', () => {
  const input={activities:[{name:'Roteiro',hours:0},{name:'Roteiro',hours:0},{name:'Revisão',hours:0}],questions:['Qual formato?']}
  assert.deepEqual(validateModelSuggestion(input,[{name:'revisao'}]).activities,[{name:'Roteiro',hours:0}])
  assert.throws(()=>validateModelSuggestion({activities:[{name:'Roteiro',hours:10}],questions:[]}))
  assert.throws(()=>validateModelSuggestion({activities:[{name:'Contrato confirmado',hours:0}],questions:[]}))
})
