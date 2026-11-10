exports.seed = async function(knex) {
  await knex('dies_sparepart_inventory').del();
  await knex('dies_sparepart_inventory').insert([
    {
      part_name: 'Piercing Punch D8.5', specifications: 'SKD11, HRC 60-62', erp_item_code: 'SP-PN-001',
      qty_in_stock: 45, min_stock_level: 20, uom: 'Pcs', rack_location: 'RACK-A-01',
      unit_price: 150000, life_expectancy_hits: 50000, supplier: 'Misumi'
    },
    {
      part_name: 'Guide Post 20x100', specifications: 'SUJ2, High Precision', erp_item_code: 'SP-GP-021',
      qty_in_stock: 12, min_stock_level: 10, uom: 'Pcs', rack_location: 'RACK-B-05',
      unit_price: 350000, life_expectancy_hits: 200000, supplier: 'Punch Industry'
    },
    {
      part_name: 'Coil Spring Heavy Duty', specifications: 'Yellow 50x100', erp_item_code: 'SP-SPR-089',
      qty_in_stock: 150, min_stock_level: 50, uom: 'Pcs', rack_location: 'RACK-C-12',
      unit_price: 85000, life_expectancy_hits: 150000, supplier: 'Tohatsu'
    },
    {
      part_name: 'Stripper Plate Insert', specifications: 'SKD11, Wire Cut', erp_item_code: 'SP-INS-044',
      qty_in_stock: 2, min_stock_level: 5, uom: 'Pcs', rack_location: 'RACK-A-04',
      unit_price: 1250000, life_expectancy_hits: 80000, supplier: 'Internal Toolroom'
    },
    {
      part_name: 'Bending Insert Block', specifications: 'DC53, TiCN Coating', erp_item_code: 'SP-BND-012',
      qty_in_stock: 8, min_stock_level: 10, uom: 'Pcs', rack_location: 'RACK-D-02',
      unit_price: 850000, life_expectancy_hits: 100000, supplier: 'Internal Toolroom'
    }
  ]);
};
