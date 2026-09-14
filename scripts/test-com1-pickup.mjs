import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const frontend = fs.readFileSync('script.js', 'utf8');
const helper = frontend.slice(frontend.indexOf('function isPickupOnlyProduct('), frontend.indexOf('function loadCart('));
const context = vm.createContext({});
vm.runInContext(helper, context);
assert.equal(context.isPickupOnlyProduct({ sku: 'COM1-MON-MSI-MP273U' }), true);
assert.equal(context.isPickupOnlyProduct({ slug: 'com1-monitor-msi-mp273u' }), true);
assert.equal(context.isPickupOnlyProduct({ sku: 'TM8-CABLE', slug: 'usb-c-cable' }), false);

class Input { constructor(value, checked = false) { this.value = value; this.checked = checked; } }
class Element {}
class Option {}
class Select {}
const pickup = new Input('pickup');
const delivery = new Input('delivery', true);
const notice = new Element();
let cart = [{ sku: 'TM8-CABLE' }, { sku: 'COM1-MON-MSI-MP273U' }];
Object.assign(context, { HTMLInputElement: Input, HTMLElement: Element, HTMLOptionElement: Option, HTMLSelectElement: Select, loadCart: () => cart, fulfillmentFields: [pickup, delivery], fulfillmentCards: [], root: { querySelector: () => notice }, warehouseOption: null, storeField: null, pickupPanel: null });
const start = frontend.indexOf('  const syncFulfillmentState = () => {');
const end = frontend.indexOf('  const renderStoreSelectionDetail', start);
vm.runInContext('let selectedFulfillment;\n' + frontend.slice(start, end) + '\nsyncFulfillmentState();', context);
assert.equal(delivery.disabled, true);
assert.equal(delivery.checked, false);
assert.equal(pickup.checked, true);
assert.equal(notice.hidden, false);
cart = [{ sku: 'TM8-CABLE' }];
vm.runInContext('syncFulfillmentState()', context);
assert.equal(delivery.disabled, false);
assert.equal(notice.hidden, true);

for (const name of ['submit-order', 'create-checkout-session']) {
  const source = fs.readFileSync(`supabase/functions/${name}/index.ts`, 'utf8');
  const start = source.indexOf("    if (fulfillmentMethod !== 'pickup' && products.some");
  assert.ok(start > 0);
  const block = source.slice(start, source.indexOf('    const productsBySlug', start));
  const validate = vm.runInNewContext(`(fulfillmentMethod, products) => { ${block} return null; }`, { Response, corsHeaders: {} });
  assert.equal(validate('shipping', [{sku:'TM8-CABLE'}, {sku:'COM1-MON-MSI-MP273U'}]).status, 422);
  assert.equal(validate('shipping', [{slug:'com1-monitor-msi-mp273u'}]).status, 422);
  assert.equal(validate('pickup', [{sku:'COM1-MON-MSI-MP273U'}]), null);
  assert.equal(validate('shipping', [{sku:'TM8-CABLE'}]), null);
}
console.log('Passed: monitor and mixed-cart pickup enforcement; ordinary delivery preserved; both server endpoints reject monitor shipping.');
