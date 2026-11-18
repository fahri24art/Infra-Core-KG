const express = require('express');


const router = express.Router();


const db = require('../db');


const path = require('path');


const fs = require('fs');


const { pollDevice } = require('../services/ricoh_snmp');


const xlsx = require('xlsx');
const { getCurrentBillingCycle, getPreviousBillingCycle, performBillingCycleReset } = require('../services/ricoh_billing_cycle');
const { generateUniquePin } = require('../services/asset_sync');
const configService = require('../services/configService');
// Auto Excel generation function for Ricoh Address Book


const generateExcelFile = async (org = (process.env.PLANT_CODE || 'TCF-KG')) => {
  try {
    const orgDb = db.getDb ? db.getDb(org) : db;
    const rows = await orgDb('ricoh_device_quotas')
      .leftJoin('assets', 'assets.id', orgDb.raw('COALESCE(ricoh_device_quotas.asset_id, (SELECT a2.id FROM assets a2 WHERE a2.name = ricoh_device_quotas.computer_name LIMIT 1))'))
      .leftJoin('users', 'assets.user_id', 'users.id')
      .leftJoin('hr_employees as hr', 'assets.hr_employee_id', 'hr.id')
      .leftJoin('ricoh_departments', 'ricoh_device_quotas.department_id', 'ricoh_departments.id')
      .select(
        'ricoh_device_quotas.*',
        'assets.contact as inventory_contact',
        orgDb.raw("COALESCE(hr.name, users.name, assets.contact, '-') as inventory_user_name"),
        orgDb.raw("COALESCE(ricoh_departments.name, hr.department, users.department, assets.location, 'General') as department_name")
      )
      .orderBy('ricoh_device_quotas.computer_name', 'asc');


      


    const data = rows.map(row => ({


      'Computer Name': row.computer_name,


      'Employee Name': row.inventory_user_name || row.inventory_contact || '-',


      'PIN (User Code)': row.user_code || '',


      'B/W Quota': row.monthly_quota_bw || 0,
      'Color Quota': row.monthly_quota_color || 0,
      'Copy B/W Quota': row.monthly_quota_copier_bw ?? (row.monthly_quota_copier || 0),
      'Copy Color Quota': row.monthly_quota_copier_color ?? 0,
      'Copy Total Quota': row.monthly_quota_copier || 0,
      'Print B/W Usage': Number(row.current_usage_bw) || 0,
      'Print Color Usage': Number(row.current_usage_color) || 0,
      'Copy B/W Usage': Number(row.current_usage_copier_bw) || 0,
      'Copy Color Usage': Number(row.current_usage_copier_color) || 0,
      'Total Print': (Number(row.current_usage_bw) || 0) + (Number(row.current_usage_color) || 0),
      'Total Copy': (Number(row.current_usage_copier_bw) || 0) + (Number(row.current_usage_copier_color) || 0),
      'Grand Total': (Number(row.current_usage_bw) || 0) + (Number(row.current_usage_color) || 0) + (Number(row.current_usage_copier_bw) || 0) + (Number(row.current_usage_copier_color) || 0),
      'Department': row.department_name || 'Unassigned',
      'Status': row.status || 'active'
    }));


    


    const ws = xlsx.utils.json_to_sheet(data);


    const wb = xlsx.utils.book_new();


    xlsx.utils.book_append_sheet(wb, ws, "Ricoh Quotas");


    


    const exportDir = path.join(__dirname, '../exports');


    if (!fs.existsSync(exportDir)) {


      fs.mkdirSync(exportDir, { recursive: true });


    }


    const filePath = path.join(exportDir, 'ricoh_quotas_report.xlsx');


    xlsx.writeFile(wb, filePath);


    console.log(`[+] Auto-generated Excel file at: ${filePath}`);


  } catch (err) {


    console.error('[-] Failed to fetch device quotas for auto-Excel:', err.message);


  }


};





const resolveDepartmentId = (deptStr, locStr, contactStr, nameStr, deptMap) => {
  // Normalize strings
  const clean = (val) => (val || '').toString().toLowerCase().trim();
  const d = clean(deptStr);
  const loc = clean(locStr);
  const contact = clean(contactStr);
  const name = clean(nameStr);

  // Priority 1: Official HR Department / Linked User Department (Highest Source of Truth)
  if (d && d !== 'general' && d !== 'nan' && d !== 'departemen') {
    if (d.includes('market') || d.includes('sales')) return deptMap['marketing'] || 1;
    if (d.includes('hr') || d.includes('ga') || d.includes('hrd')) return deptMap['hrga'] || 2;
    if (d.includes('qmr')) return deptMap['qmr'] || 3;
    if (d.includes('purchas') || d.includes('procure') || d.includes('store')) return deptMap['purchasing'] || 4;
    if (d.includes('production engineering') || d.includes('pe')) return deptMap['engineering pe'] || 5;
    if (d.includes('r&d') || d.includes('rnd') || d.includes('research')) return deptMap['engineering r&d'] || 6;
    if (d.includes('tool') || d.includes('tstm') || d.includes('mold')) return deptMap['engineering tstm'] || 7;
    if (d.includes('maint') || d.includes('mtc')) return deptMap['maintenance'] || 8;
    if (d.includes('qc') || d.includes('quality') || d.includes('cmm')) return deptMap['qc'] || 9;
    if (d.includes('ict') || d.includes('it') || d.includes('edp')) return deptMap['ict'] || 10;
    if (d.includes('ppic')) return deptMap['ppic'] || 11;
    if (d.includes('prod') || d.includes('manufactur') || d.includes('shopfloor') || d.includes('fa')) return deptMap['produksi'] || 12;
  }

  // Priority 2: Contact / PIC Identity clues (e.g. "PE FEBRY", "RECKA CHANTIKA", "PPIC MIRNA")
  const personStr = `${contact} ${name}`.toLowerCase();
  if (personStr.includes('pe febry') || personStr.includes('febry')) return deptMap['engineering pe'] || 5;
  if (personStr.includes('recka') || personStr.includes('dian oktarika') || personStr.includes('jajang saep') || personStr.includes('naufal rifqi')) return deptMap['hrga'] || 2;
  if (personStr.includes('ppic') || personStr.includes('deli0098') || personStr.includes('khalda') || personStr.includes('awik') || personStr.includes('saiko') || personStr.includes('indra gunawan')) return deptMap['ppic'] || 11;
  if (personStr.includes('purnomo') || personStr.includes('amirullah') || personStr.includes('suprayitno')) return deptMap['maintenance'] || 8;
  if (personStr.includes('sumartono') || personStr.includes('cmm') || personStr.includes('ihwani') || personStr.includes('agung premana') || personStr.includes('taufik')) return deptMap['qc'] || 9;
  if (personStr.includes('yordan')) return deptMap['engineering pe'] || 5;
  if (personStr.includes('putra rian') || personStr.includes('sutijo') || personStr.includes('feri cipto') || personStr.includes('eko susanto') || personStr.includes('vikri')) return deptMap['produksi'] || 12;
  if (personStr.includes('tasya') || personStr.includes('sindi') || personStr.includes('felix') || personStr.includes('dhani') || personStr.includes('market')) return deptMap['marketing'] || 1;
  if (personStr.includes('tika wullan') || personStr.includes('qmr')) return deptMap['qmr'] || 3;
  if (personStr.includes('nurul aeni') || personStr.includes('karin aprilda') || personStr.includes('purchas') || personStr.includes('pur')) return deptMap['purchasing'] || 4;

  // Priority 3: Asset Location (Physical office room / area)
  if (loc && loc !== 'general' && loc !== 'office' && loc !== 'unknown' && loc !== 'tcf-sg') {
    if (loc.includes('market') || loc.includes('sales')) return deptMap['marketing'] || 1;
    if (loc.includes('hr') || loc.includes('ga') || loc.includes('hrd')) return deptMap['hrga'] || 2;
    if (loc.includes('qmr')) return deptMap['qmr'] || 3;
    if (loc.includes('purchas') || loc.includes('procure') || loc.includes('store')) return deptMap['purchasing'] || 4;
    if (loc.includes('production engineering') || loc.includes('pe')) return deptMap['engineering pe'] || 5;
    if (loc.includes('r&d') || loc.includes('rnd') || loc.includes('research')) return deptMap['engineering r&d'] || 6;
    if (loc.includes('tool') || loc.includes('tstm') || loc.includes('mold')) return deptMap['engineering tstm'] || 7;
    if (loc.includes('maint') || loc.includes('mtc')) return deptMap['maintenance'] || 8;
    if (loc.includes('qc') || loc.includes('quality') || loc.includes('cmm')) return deptMap['qc'] || 9;
    if (loc.includes('ict') || loc.includes('it') || loc.includes('edp')) return deptMap['ict'] || 10;
    if (loc.includes('ppic')) return deptMap['ppic'] || 11;
    if (loc.includes('prod') || loc.includes('manufactur') || loc.includes('shopfloor') || loc.includes('fa')) return deptMap['produksi'] || 12;
  }

  // Priority 4: Device Hostname prefix ONLY for genuine department prefixes (NEVER generic ICT asset tag!)
  if (name.startsWith('ppic') || name.includes('-ppic')) return deptMap['ppic'] || 11;
  if (name.startsWith('mkt') || name.includes('-mkt')) return deptMap['marketing'] || 1;
  if (name.startsWith('pur') || name.includes('-pur')) return deptMap['purchasing'] || 4;
  if (name.startsWith('mtc') || name.includes('-mtc')) return deptMap['maintenance'] || 8;
  if (name.startsWith('qc') || name.includes('-qc') || name.includes('cmm')) return deptMap['qc'] || 9;
  if (name.includes('prod')) return deptMap['produksi'] || 12;
  if (name.startsWith('design') || name.startsWith('eng')) return deptMap['engineering tstm'] || 7;

  // Genuine ICT IT-Infrastructure machines:
  if (personStr.includes('fahrurodin') || personStr.includes('mulyana') || personStr.includes('roni sugiarto') || personStr.includes('tcfsg administrator') || name.includes('desktop-4o314l4') || name.includes('desktop-d8168qd') || name.includes('desktop-e7412uc') || name.includes('pc-pc rakitan') || name.includes('desktop-tq8i4r5') || name.includes('ict-67543')) {
    return deptMap['ict'] || 10;
  }

  return deptMap['produksi'] || 12;
};

const syncInventoryToDeviceQuotas = async () => {
  try {
    const ricohDepts = await db('ricoh_departments').select('id', 'name');
    const deptMap = {};
    for (const d of ricohDepts) {
      deptMap[d.name.toLowerCase().trim()] = d.id;
    }

    const assets = await db('assets')
      .whereIn('category', ['Desktop', 'Laptop', 'Computer', 'Notebook']);

    const validAssets = assets.filter(a => {
      if (!a.name || !a.name.trim()) return false;
      // Exclude blank phantom records that have no IP/specs
      if (a.name.trim().toLowerCase() === 'unknown device' && !a.ip_address) return false;
      return true;
    });

    if (validAssets.length > 0) {
      const allUsers = await db('users').select('id', 'name', 'department', 'whatsapp', 'hr_employee_id');
      const allHr = await db('hr_employees').select('id', 'name', 'department', 'phone');
      const userByName = {};
      const userById = {};
      const userByHrId = {};
      for (const u of allUsers) {
        userById[u.id] = u;
        if (u.name) userByName[u.name.toLowerCase().trim()] = u;
        if (u.hr_employee_id) userByHrId[u.hr_employee_id] = u;
      }
      const hrById = {};
      for (const h of allHr) {
        hrById[h.id] = h;
      }

      for (const asset of validAssets) {
        let linkedHr = asset.hr_employee_id ? hrById[asset.hr_employee_id] : null;
        let linkedUser = asset.user_id ? userById[asset.user_id] : null;

        // Auto sync asset.user_id if hr_employee_id has a user account
        if (asset.hr_employee_id && userByHrId[asset.hr_employee_id]) {
          const matchedUser = userByHrId[asset.hr_employee_id];
          if (asset.user_id !== matchedUser.id) {
            await db('assets').where('id', asset.id).update({ user_id: matchedUser.id });
            linkedUser = matchedUser;
          }
        } else if (!linkedUser && asset.contact) {
          const contactClean = asset.contact.toLowerCase().trim();
          linkedUser = userByName[contactClean] || null;
          if (linkedUser) {
            await db('assets').where('id', asset.id).update({ user_id: linkedUser.id });
          }
        }

        // Auto link hr_employee_id if missing but user has it or contact matches HR employee
        if (!linkedHr && linkedUser && linkedUser.hr_employee_id && hrById[linkedUser.hr_employee_id]) {
          linkedHr = hrById[linkedUser.hr_employee_id];
          await db('assets').where('id', asset.id).update({ hr_employee_id: linkedHr.id });
        }
        if (!linkedHr && asset.contact) {
          const contactClean = asset.contact.toLowerCase().trim();
          const matchedHr = allHr.find(h => h.name && h.name.toLowerCase().trim() === contactClean);
          if (matchedHr) {
            linkedHr = matchedHr;
            await db('assets').where('id', asset.id).update({ hr_employee_id: matchedHr.id });
          }
        }

        const deptStr = (linkedHr && linkedHr.department) || (linkedUser && linkedUser.department) || '';
        const picName = (linkedHr && linkedHr.name) || (linkedUser && linkedUser.name) || '';
        const resolvedDeptId = resolveDepartmentId(deptStr, asset.location, `${asset.contact || ''} ${picName}`, asset.name, deptMap);

        const existingQuota = await db('ricoh_device_quotas').where('computer_name', asset.name).first();
        let pin = existingQuota?.user_code;
        if (!pin || pin.trim() === '') {
          pin = await generateUniquePin(db);
        }

        const isUnassignedRepair = String(asset.status || '').toLowerCase().includes('repair') && !asset.user_id && !asset.hr_employee_id;

        if (!existingQuota && !isUnassignedRepair) {
          await db('ricoh_device_quotas').insert({
            computer_name: asset.name,
            ip_address: asset.ip_address || '',
            monthly_quota: 1500,
            current_usage: 0,
            monthly_quota_bw: 1000,
            current_usage_bw: 0,
            monthly_quota_color: 500,
            current_usage_color: 0,
            current_usage_copier_bw: 0,
            current_usage_copier_color: 0,
            lifetime_bw: 0,
            lifetime_color: 0,
            lifetime_copier_bw: 0,
            lifetime_copier_color: 0,
            monthly_quota_copier: 200,
            monthly_quota_copier_bw: 160,
            monthly_quota_copier_color: 40,
            copier_status: 'active',
            copier_bw_status: 'active',
            copier_color_status: 'active',
            user_code: pin,
            status: 'active',
            asset_id: asset.id,
            department_id: resolvedDeptId,
            last_reset: new Date()
          });
        } else {
          const updatePayload = {
            asset_id: asset.id,
            ip_address: asset.ip_address || existingQuota.ip_address || ''
          };
          if (!existingQuota.user_code || existingQuota.user_code.trim() === '') {
            updatePayload.user_code = pin;
          }
          // Permanent lock: only assign department if existing quota does not have one yet
          if (!existingQuota.department_id && resolvedDeptId) {
            updatePayload.department_id = resolvedDeptId;
          }
          await db('ricoh_device_quotas').where('computer_name', asset.name).update(updatePayload);
        }
      }

      const validNames = validAssets.map(a => a.name.trim());
      await db('ricoh_device_quotas').whereNotIn('computer_name', validNames).del();

      await generateExcelFile();
    }
  } catch (err) {
    console.error("Error syncing inventory to device quotas:", err.message);
  }
};





// --- ROUTES ---





router.get('/jobs', async (req, res) => {


  try {


    const limit = req.query.limit || 2000;


    const dateStr = req.query.date;





    let query = db('ricoh_print_jobs')
      .distinctOn('ricoh_print_jobs.id')
      .leftJoin('ricoh_device_quotas', function() {
        this.on(db.raw('LOWER(TRIM(ricoh_print_jobs.user_name))'), '=', db.raw('LOWER(TRIM(ricoh_device_quotas.computer_name))'))
            .orOn(db.raw("(ricoh_print_jobs.user_id IS NOT NULL AND TRIM(ricoh_print_jobs.user_id) != '' AND LOWER(TRIM(ricoh_print_jobs.user_id)) = LOWER(TRIM(ricoh_device_quotas.user_code)))"));
      })
      .leftJoin('assets', function() {
        this.on('assets.id', '=', 'ricoh_device_quotas.asset_id')
            .orOn(db.raw('LOWER(TRIM(ricoh_print_jobs.user_name))'), '=', db.raw('LOWER(TRIM(assets.name))'))
            .orOn(db.raw('LOWER(TRIM(ricoh_print_jobs.user_name))'), '=', db.raw('LOWER(TRIM(assets.contact))'))
            .orOn(db.raw('LOWER(TRIM(ricoh_print_jobs.user_name))'), '=', db.raw("LOWER(TRIM(SPLIT_PART(assets.contact, '@', 1)))"))
            .orOn(db.raw("LOWER(TRIM(SPLIT_PART(ricoh_print_jobs.user_name, '@', 1)))"), '=', db.raw("LOWER(TRIM(assets.contact))"))
            .orOn(db.raw("LOWER(TRIM(SPLIT_PART(ricoh_print_jobs.user_name, '@', 2)))"), '=', db.raw("LOWER(TRIM(assets.name))"))
            .orOn(db.raw('LOWER(TRIM(ricoh_print_jobs.user_name))'), '=', db.raw("LOWER(TRIM(assets.windows_login))"))
            .orOn(db.raw('LOWER(TRIM(ricoh_print_jobs.user_name))'), '=', db.raw("LOWER(TRIM(SPLIT_PART(assets.windows_login, ?, 2)))", ['\\']))
            .orOn(db.raw("(LENGTH(TRIM(ricoh_print_jobs.user_name)) >= 4 AND assets.contact ILIKE '%' || TRIM(ricoh_print_jobs.user_name) || '%')"))
            .orOn(db.raw("(LENGTH(TRIM(ricoh_print_jobs.user_name)) >= 4 AND assets.windows_login ILIKE '%' || TRIM(ricoh_print_jobs.user_name) || '%')"));
      })
      .leftJoin('hr_employees as hr', 'assets.hr_employee_id', 'hr.id')
      .leftJoin('users', 'assets.user_id', 'users.id')
      .leftJoin('hr_employees as hr_spooler', function() {
        this.on(db.raw(`
          hr.id IS NULL AND users.id IS NULL
          AND ricoh_print_jobs.user_id IS NOT NULL 
          AND LENGTH(TRIM(ricoh_print_jobs.user_id)) >= 3
          AND LOWER(TRIM(hr_spooler.name)) ILIKE '%' || LOWER(TRIM(ricoh_print_jobs.user_id)) || '%'
        `));
      })
      .leftJoin('ricoh_devices', 'ricoh_print_jobs.printer_ip', 'ricoh_devices.ip')
      .select(
        'ricoh_print_jobs.*', 
        'ricoh_device_quotas.user_code as pin_code',
        'assets.id as asset_id',
        db.raw('COALESCE(assets.hr_employee_id, assets.user_id) as employee_id'),
        db.raw("COALESCE(hr.name, hr_spooler.name, users.name, assets.contact, '-') as employee_name"),
        'assets.contact as inventory_contact',
        db.raw("COALESCE(ricoh_device_quotas.computer_name, assets.name, ricoh_print_jobs.user_name, '-') as asset_computer_name"),
        db.raw("COALESCE(assets.windows_login, assets.contact, ricoh_print_jobs.user_name) as pc_login"),
        'ricoh_devices.name as printer_name',
        db.raw(`
          CASE 
            WHEN ricoh_device_quotas.user_code IS NOT NULL AND ricoh_print_jobs.user_id = ricoh_device_quotas.user_code THEN 1
            WHEN LOWER(TRIM(ricoh_print_jobs.user_name)) = LOWER(TRIM(SPLIT_PART(assets.windows_login, ?, 2))) THEN 2
            WHEN LOWER(TRIM(ricoh_print_jobs.user_name)) = LOWER(TRIM(assets.windows_login)) THEN 3
            WHEN LOWER(TRIM(ricoh_print_jobs.user_name)) = LOWER(TRIM(assets.name)) THEN 4
            WHEN LOWER(TRIM(ricoh_print_jobs.user_name)) = LOWER(TRIM(SPLIT_PART(assets.contact, '@', 1))) THEN 5
            ELSE 6
          END as match_priority
        `, ['\\'])
      )
      .orderBy('ricoh_print_jobs.id', 'desc')
      .orderBy('match_priority', 'asc')
      .orderBy('ricoh_print_jobs.created_at', 'desc');





    if (dateStr) {


      // Create a start and end of day for the given date


      const startOfDay = new Date(dateStr);


      startOfDay.setHours(0, 0, 0, 0);


      


      const endOfDay = new Date(dateStr);


      endOfDay.setHours(23, 59, 59, 999);


      


      query = query.whereBetween('ricoh_print_jobs.created_at', [startOfDay, endOfDay]);


    } else {


      query = query.limit(limit);


    }





    const rows = await query;

    if (!req.user) {
      const sanitized = rows.map(r => ({
        ...r,
        pin_code: null,
        user_id: null,
        user_name: /^\d{3,6}$/.test(String(r.user_name || '').trim()) ? (r.asset_computer_name || '-') : r.user_name
      }));
      return res.json(sanitized);
    }

    res.json(rows);


  } catch (err) {


    res.status(500).json({ error: err.message });


  }


});





router.get('/devices', async (req, res) => {


  try {


    const rows = await db('ricoh_devices').select('*');


    res.json(rows);


  } catch (err) {


    res.status(500).json({ error: err.message });


  }


});





router.post('/devices', async (req, res) => {


  try {


    const { name, ip, model } = req.body;


    const [id] = await db('ricoh_devices').insert({


      name, ip, model: model || 'Ricoh', status: 'online'


    }).returning('id');


    res.json({ id: id?.id || id, message: 'Device added successfully' });


  } catch (err) {


    res.status(500).json({ error: err.message });


  }


});





router.delete('/devices/:id', async (req, res) => {


  try {


    await db('ricoh_devices').where('id', req.params.id).del();


    res.json({ message: 'Device deleted successfully' });


  } catch (err) {


    res.status(500).json({ error: err.message });


  }


});





router.get('/users', async (req, res) => {


  try {


    const rows = await db('ricoh_users').select('*');


    res.json(rows);


  } catch (err) {


    res.status(500).json({ error: err.message });


  }


});





router.post('/users', async (req, res) => {


  try {


    const { name, department, monthly_quota } = req.body;


    const [id] = await db('ricoh_users').insert({


      name, department, monthly_quota: monthly_quota || 1000


    }).returning('id');


    res.json({ id: id?.id || id, message: 'User added successfully' });


  } catch (err) {


    res.status(500).json({ error: err.message });


  }


});





router.delete('/users/:id', async (req, res) => {


  try {


    await db('ricoh_users').where('id', req.params.id).del();


    res.json({ message: 'User deleted successfully' });


  } catch (err) {


    res.status(500).json({ error: err.message });


  }


});





// --- DEPARTMENTS ---





// Helper to synchronize accumulated department quotas from member devices
async function syncDepartmentQuotas(deptId = null) {
  try {
    let query = db('ricoh_device_quotas');
    if (deptId) {
      query = query.where('department_id', deptId);
    } else {
      query = query.whereNotNull('department_id');
    }
    const aggregated = await query
      .select('department_id')
      .sum('monthly_quota_bw as total_bw')
      .sum('monthly_quota_color as total_color')
      .sum('monthly_quota_copier as total_copier')
      .sum('monthly_quota_copier_bw as total_copier_bw')
      .sum('monthly_quota_copier_color as total_copier_color')
      .groupBy('department_id');

    for (const agg of aggregated) {
      if (agg.department_id) {
        const totCpyBw = Number(agg.total_copier_bw) || 0;
        const totCpyColor = Number(agg.total_copier_color) || 0;
        await db('ricoh_departments')
          .where('id', agg.department_id)
          .update({
            monthly_quota_bw: Number(agg.total_bw) || 0,
            monthly_quota_color: Number(agg.total_color) || 0,
            monthly_quota_copier_bw: totCpyBw,
            monthly_quota_copier_color: totCpyColor,
            monthly_quota_copier: (totCpyBw + totCpyColor) || Number(agg.total_copier) || 0
          });
      }
    }
  } catch (err) {
    console.error('Error syncing department quotas:', err.message);
  }
}

router.get('/departments', async (req, res) => {
  try {
    const departments = await db('ricoh_departments').orderBy('name', 'asc');
    const devices = await db('ricoh_device_quotas')
      .leftJoin('assets', 'assets.id', db.raw('COALESCE(ricoh_device_quotas.asset_id, (SELECT a2.id FROM assets a2 WHERE a2.name = ricoh_device_quotas.computer_name LIMIT 1))'))
      .leftJoin('users', 'assets.user_id', 'users.id')
      .select(
        'ricoh_device_quotas.*',
        'assets.contact as asset_contact',
        'users.name as user_name',
        'users.whatsapp as user_whatsapp',
        'users.email as user_email'
      );

    const result = departments.map(dept => {
      const deptDevices = devices.filter(d => Number(d.department_id) === Number(dept.id));
      const uBw = deptDevices.reduce((sum, d) => sum + (Number(d.current_usage_bw) || 0), 0);
      const uColor = deptDevices.reduce((sum, d) => sum + (Number(d.current_usage_color) || 0), 0);
      const uCopierBw = deptDevices.reduce((sum, d) => sum + (Number(d.current_usage_copier_bw) || 0), 0);
      const uCopierColor = deptDevices.reduce((sum, d) => sum + (Number(d.current_usage_copier_color) || 0), 0);
      const uCopier = uCopierBw + uCopierColor;
      
      // Auto-accumulate quotas from member devices (User / PC Quotas)
      const sumQuotaBw = deptDevices.reduce((sum, d) => sum + (Number(d.monthly_quota_bw) || 0), 0);
      const sumQuotaColor = deptDevices.reduce((sum, d) => sum + (Number(d.monthly_quota_color) || 0), 0);
      const sumQuotaCopierBw = deptDevices.reduce((sum, d) => {
        const fb = Number(d.monthly_quota_copier) || 200;
        return sum + (d.monthly_quota_copier_bw != null ? Number(d.monthly_quota_copier_bw) : Math.round(fb * 0.8));
      }, 0);
      const sumQuotaCopierColor = deptDevices.reduce((sum, d) => {
        const fb = Number(d.monthly_quota_copier) || 200;
        const bw = d.monthly_quota_copier_bw != null ? Number(d.monthly_quota_copier_bw) : Math.round(fb * 0.8);
        return sum + (d.monthly_quota_copier_color != null ? Number(d.monthly_quota_copier_color) : Math.max(0, fb - bw));
      }, 0);
      const sumQuotaCopier = sumQuotaCopierBw + sumQuotaCopierColor;

      // If department has devices assigned, the department quota is automatically the accumulated total of member PC quotas!
      const qBw = deptDevices.length > 0 ? sumQuotaBw : (Number(dept.monthly_quota_bw) || 0);
      const qColor = deptDevices.length > 0 ? sumQuotaColor : (Number(dept.monthly_quota_color) || 0);
      const deptFbCopier = Number(dept.monthly_quota_copier) || 0;
      const deptDefCopierBw = dept.monthly_quota_copier_bw != null ? Number(dept.monthly_quota_copier_bw) : Math.round(deptFbCopier * 0.8);
      const deptDefCopierColor = dept.monthly_quota_copier_color != null ? Number(dept.monthly_quota_copier_color) : Math.max(0, deptFbCopier - deptDefCopierBw);
      const qCopierBw = deptDevices.length > 0 ? sumQuotaCopierBw : deptDefCopierBw;
      const qCopierColor = deptDevices.length > 0 ? sumQuotaCopierColor : deptDefCopierColor;
      const qCopier = qCopierBw + qCopierColor;

      const distinctUsers = new Set();
      deptDevices.forEach(d => {
        const u = d.user_name || d.asset_contact;
        if (u && u !== 'Unassigned') distinctUsers.add(u);
      });

      return {
        ...dept,
        monthly_quota_bw: qBw,
        monthly_quota_color: qColor,
        monthly_quota_copier: qCopier,
        monthly_quota_copier_bw: qCopierBw,
        monthly_quota_copier_color: qCopierColor,
        manual_quota_bw: Number(dept.monthly_quota_bw) || 0,
        manual_quota_color: Number(dept.monthly_quota_color) || 0,
        manual_quota_copier: Number(dept.monthly_quota_copier) || 0,
        manual_quota_copier_bw: deptDefCopierBw,
        manual_quota_copier_color: deptDefCopierColor,
        current_usage_bw: uBw,
        current_usage_color: uColor,
        current_usage_copier: uCopier,
        current_usage_copier_bw: uCopierBw,
        current_usage_copier_color: uCopierColor,
        device_count: deptDevices.length,
        user_count: distinctUsers.size,
        members: deptDevices.map(d => {
          const dFb = Number(d.monthly_quota_copier) || 200;
          const dCpyBw = d.monthly_quota_copier_bw != null ? Number(d.monthly_quota_copier_bw) : Math.round(dFb * 0.8);
          const dCpyCol = d.monthly_quota_copier_color != null ? Number(d.monthly_quota_copier_color) : Math.max(0, dFb - dCpyBw);
          return {
            id: d.id,
            computer_name: d.computer_name,
            ip_address: d.ip_address,
            user_code: d.user_code,
            user_name: d.user_name || d.asset_contact || 'Unassigned',
            whatsapp: d.user_whatsapp || null,
            status: d.status,
            copier_status: d.copier_status,
            copier_bw_status: d.copier_bw_status || 'active',
            copier_color_status: d.copier_color_status || 'active',
            current_usage_bw: Number(d.current_usage_bw) || 0,
            current_usage_color: Number(d.current_usage_color) || 0,
            current_usage_copier_bw: Number(d.current_usage_copier_bw) || 0,
            current_usage_copier_color: Number(d.current_usage_copier_color) || 0,
            current_usage_copier: (Number(d.current_usage_copier_bw) || 0) + (Number(d.current_usage_copier_color) || 0),
            monthly_quota_bw: d.monthly_quota_bw != null ? Number(d.monthly_quota_bw) : 1000,
            monthly_quota_color: d.monthly_quota_color != null ? Number(d.monthly_quota_color) : 500,
            monthly_quota_copier_bw: dCpyBw,
            monthly_quota_copier_color: dCpyCol,
            monthly_quota_copier: dCpyBw + dCpyCol
          };
        })
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});





router.post('/departments', async (req, res) => {
  try {
    const { name, monthly_quota_bw, monthly_quota_color, monthly_quota_copier, monthly_quota_copier_bw, monthly_quota_copier_color } = req.body;
    const cpyBw = monthly_quota_copier_bw !== undefined ? Number(monthly_quota_copier_bw) : Math.round((Number(monthly_quota_copier) || 2000) * 0.8);
    const cpyColor = monthly_quota_copier_color !== undefined ? Number(monthly_quota_copier_color) : Math.max(0, (Number(monthly_quota_copier) || 2000) - cpyBw);
    const [id] = await db('ricoh_departments').insert({
      name, 
      monthly_quota_bw: monthly_quota_bw || 10000, 
      monthly_quota_color: monthly_quota_color || 5000,
      monthly_quota_copier_bw: cpyBw,
      monthly_quota_copier_color: cpyColor,
      monthly_quota_copier: cpyBw + cpyColor
    }).returning('id');


    res.json({ id: id?.id || id, message: 'Department added successfully' });


  } catch (err) {


    res.status(500).json({ error: err.message });


  }


});





router.put('/departments/:id/quota', async (req, res) => {
  try {
    const { monthly_quota_bw, monthly_quota_color, monthly_quota_copier, monthly_quota_copier_bw, monthly_quota_copier_color, name } = req.body;
    const updateData = {
      monthly_quota_bw, 
      monthly_quota_color, 
      name
    };
    if (monthly_quota_copier_bw !== undefined || monthly_quota_copier_color !== undefined) {
      const cpyBw = Number(monthly_quota_copier_bw) || 0;
      const cpyCol = Number(monthly_quota_copier_color) || 0;
      updateData.monthly_quota_copier_bw = cpyBw;
      updateData.monthly_quota_copier_color = cpyCol;
      updateData.monthly_quota_copier = cpyBw + cpyCol;
    } else if (monthly_quota_copier !== undefined) {
      updateData.monthly_quota_copier = monthly_quota_copier;
    }
    const updated = await db('ricoh_departments').where('id', req.params.id).update(updateData);


    res.json({ updated });


  } catch (err) {


    res.status(500).json({ error: err.message });


  }


});





router.put('/departments/:id/devices', async (req, res) => {


  try {


    const { device_ids } = req.body;


    // First, unassign all devices currently assigned to this department


    await db('ricoh_device_quotas').where('department_id', req.params.id).update({ department_id: null });


    


    // Then, assign the selected devices


    if (device_ids && device_ids.length > 0) {


      await db('ricoh_device_quotas').whereIn('id', device_ids).update({ department_id: req.params.id });


    }


    


    await syncDepartmentQuotas(req.params.id);
    res.json({ message: 'Devices assigned successfully' });


  } catch (err) {


    res.status(500).json({ error: err.message });


  }


});





router.delete('/departments/:id', async (req, res) => {


  try {


    await db('ricoh_departments').where('id', req.params.id).del();


    // Also set department_id to NULL for linked devices


    await db('ricoh_device_quotas').where('department_id', req.params.id).update({ department_id: null });


    res.json({ message: 'Department deleted successfully' });


  } catch (err) {


    res.status(500).json({ error: err.message });


  }


});





router.get('/public/printers', async (req, res) => {


  try {


    const rows = await db('ricoh_devices').select('id', 'name', 'ip', 'model', 'status').where('status', 'online');


    res.json(rows);


  } catch (err) {


    res.status(500).json({ error: err.message });


  }


});





router.post('/public/select-printer', async (req, res) => {


  try {


    const { user_id, printer_id } = req.body;


    await db('ricoh_users').where('id', user_id).update({ current_printer_id: printer_id });


    res.json({ message: 'Target printer updated' });


  } catch (err) {


    res.status(500).json({ error: err.message });


  }


});





router.get('/logs', async (req, res) => {


  try {


    const ninetyDaysAgo = new Date();


    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);


    


    const rows = await db('ricoh_system_logs')


      .select('*')


      .where('timestamp', '>=', ninetyDaysAgo)


      .orderBy('timestamp', 'desc')


      .limit(15000); // safety cap


    if (!req.user) {
      const sanitizedLogs = rows.map(r => ({
        ...r,
        message: typeof r.message === 'string'
          ? r.message.replace(/PIN[:\s]*\d{3,8}/gi, 'PIN ***')
          : r.message
      }));
      return res.json(sanitizedLogs);
    }

    res.json(rows);


  } catch (err) {


    res.status(500).json({ error: err.message });


  }


});





router.put('/users/:id/status', async (req, res) => {


  try {


    const { status } = req.body;


    await db('ricoh_users').where('id', req.params.id).update({ status });


    res.json({ message: `User status updated to ${status}` });


  } catch (err) {


    res.status(500).json({ error: err.message });


  }


});





router.put('/users/:id/quota', async (req, res) => {


  try {


    const { monthly_quota } = req.body;


    const updated = await db('ricoh_users').where('id', req.params.id).update({ monthly_quota });


    res.json({ updated });


  } catch (err) {


    res.status(500).json({ error: err.message });


  }


});





router.get('/devices/quotas', async (req, res) => {
  try {
    await ensureSupervisorColumns(db);
    await syncInventoryToDeviceQuotas();

    const rows = await db('ricoh_device_quotas')
      .leftJoin('assets', 'assets.id', db.raw('COALESCE(ricoh_device_quotas.asset_id, (SELECT a2.id FROM assets a2 WHERE a2.name = ricoh_device_quotas.computer_name LIMIT 1))'))
      .leftJoin('users', 'assets.user_id', 'users.id')
      .leftJoin('hr_employees as hr', 'assets.hr_employee_id', 'hr.id')
      .leftJoin('hr_employees as sup_hr', 'ricoh_device_quotas.supervisor_hr_id', 'sup_hr.id')
      .leftJoin('ricoh_departments', 'ricoh_device_quotas.department_id', 'ricoh_departments.id')
      .select(
        'ricoh_device_quotas.*',
        'assets.id as asset_id',
        'assets.name as asset_name',
        'assets.location as asset_location',
        'assets.contact as inventory_contact',
        'users.id as user_id',
        db.raw("COALESCE(hr.name, users.name, assets.contact, '-') as inventory_user_name"),
        db.raw("COALESCE(hr.phone, users.whatsapp) as user_whatsapp"),
        'users.email as user_email',
        db.raw("COALESCE(hr.department, users.department) as user_department"),
        db.raw("COALESCE(ricoh_departments.name, hr.department, users.department, assets.location, 'General') as department_name"),
        db.raw("COALESCE(sup_hr.name, ricoh_device_quotas.supervisor_name) as supervisor_name"),
        'sup_hr.position as supervisor_position',
        db.raw("COALESCE(sup_hr.phone, ricoh_device_quotas.supervisor_whatsapp) as supervisor_whatsapp")
      )
      .orderBy('ricoh_device_quotas.computer_name', 'asc');

    const enriched = rows.map(r => {
      const qBw = r.monthly_quota_bw != null ? Number(r.monthly_quota_bw) : 1000;
      const uBw = Number(r.current_usage_bw) || 0;
      const qColor = r.monthly_quota_color != null ? Number(r.monthly_quota_color) : 500;
      const uColor = Number(r.current_usage_color) || 0;

      const fbCopier = r.monthly_quota_copier != null ? Number(r.monthly_quota_copier) : 200;
      const qCopierBw = r.monthly_quota_copier_bw != null ? Number(r.monthly_quota_copier_bw) : Math.round(fbCopier * 0.8);
      const qCopierColor = r.monthly_quota_copier_color != null ? Number(r.monthly_quota_copier_color) : Math.max(0, fbCopier - qCopierBw);
      const uCopierBw = Number(r.current_usage_copier_bw) || 0;
      const uCopierColor = Number(r.current_usage_copier_color) || 0;

      const qCopier = qCopierBw + qCopierColor;
      const uCopier = uCopierBw + uCopierColor;

      const bw_pct = qBw > 0 ? Math.round((uBw / qBw) * 100) : (uBw > 0 ? 100 : 0);
      const color_pct = qColor > 0 ? Math.round((uColor / qColor) * 100) : (uColor > 0 ? 100 : 0);
      const copier_bw_pct = qCopierBw > 0 ? Math.round((uCopierBw / qCopierBw) * 100) : (uCopierBw > 0 ? 100 : 0);
      const copier_color_pct = qCopierColor > 0 ? Math.round((uCopierColor / qCopierColor) * 100) : (uCopierColor > 0 ? 100 : 0);
      const copier_pct = qCopier > 0 ? Math.round((uCopier / qCopier) * 100) : (uCopier > 0 ? 100 : 0);
      const max_pct = Math.max(bw_pct, color_pct, copier_bw_pct, copier_color_pct);

      const rowOut = {
        ...r,
        monthly_quota_bw: qBw,
        monthly_quota_color: qColor,
        monthly_quota_copier_bw: qCopierBw,
        monthly_quota_copier_color: qCopierColor,
        monthly_quota_copier: qCopier,
        bw_pct,
        color_pct,
        copier_bw_pct,
        copier_color_pct,
        copier_pct,
        max_pct,
        is_warning_80: max_pct >= 80,
        is_warning_90: max_pct >= 90,
        is_critical_99: max_pct >= 99
      };

      if (!req.user) {
        delete rowOut.user_code;
        delete rowOut.user_whatsapp;
        delete rowOut.user_email;
      }

      return rowOut;
    });

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});





router.post('/devices/quotas', async (req, res) => {


  try {


    const { computer_name, ip_address, monthly_quota_bw, monthly_quota_color, monthly_quota_copier, monthly_quota_copier_bw, monthly_quota_copier_color, user_code, department_id } = req.body;
    const pin = user_code || Math.floor(1000 + Math.random() * 9000).toString();
    const cpyBw = monthly_quota_copier_bw !== undefined ? Number(monthly_quota_copier_bw) : Math.round((Number(monthly_quota_copier) || 200) * 0.8);
    const cpyColor = monthly_quota_copier_color !== undefined ? Number(monthly_quota_copier_color) : Math.max(0, (Number(monthly_quota_copier) || 200) - cpyBw);

    const [id] = await db('ricoh_device_quotas').insert({
      computer_name, ip_address: ip_address || '', 
      monthly_quota_bw: monthly_quota_bw || 1000, 
      monthly_quota_color: monthly_quota_color || 500,
      monthly_quota_copier_bw: cpyBw,
      monthly_quota_copier_color: cpyColor,
      monthly_quota_copier: cpyBw + cpyColor,
      copier_status: 'active',
      copier_bw_status: 'active',
      copier_color_status: 'active',
      current_usage_bw: 0, current_usage_color: 0,
      current_usage_copier_bw: 0, current_usage_copier_color: 0,
      user_code: pin, department_id: department_id || null
    }).returning('id');

    await generateExcelFile();

    res.json({ id: id?.id || id, message: 'Device quota registered successfully', user_code: pin });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/devices/quotas/:id/quota', async (req, res) => {
  try {
    await ensureSupervisorColumns(db);
    const {
      monthly_quota_bw,
      monthly_quota_color,
      monthly_quota_copier,
      monthly_quota_copier_bw,
      monthly_quota_copier_color,
      user_code,
      department_id,
      supervisor_hr_id,
      supervisor_name,
      supervisor_whatsapp,
      wa_notify_mode
    } = req.body;

    const targetDevice = await db('ricoh_device_quotas').where('id', req.params.id).first();
    if (!targetDevice) return res.status(404).json({ error: "Device not found" });

    let resolvedSupHrId = supervisor_hr_id !== undefined ? (supervisor_hr_id ? parseInt(supervisor_hr_id, 10) : null) : targetDevice.supervisor_hr_id;
    let resolvedSupName = supervisor_name !== undefined ? (supervisor_name || null) : targetDevice.supervisor_name;
    let resolvedSupWa = supervisor_whatsapp !== undefined ? (supervisor_whatsapp || null) : targetDevice.supervisor_whatsapp;
    if (supervisor_hr_id !== undefined) {
      if (resolvedSupHrId) {
        const supEmp = await db('hr_employees').where({ id: resolvedSupHrId }).first();
        if (supEmp) {
          resolvedSupName = supEmp.name;
          resolvedSupWa = supEmp.phone || resolvedSupWa;
        }
      } else {
        resolvedSupName = supervisor_name || null;
        resolvedSupWa = supervisor_whatsapp || null;
      }
    }
    const resolvedNotifyMode = wa_notify_mode !== undefined ? (wa_notify_mode || 'auto') : (targetDevice.wa_notify_mode || 'auto');

    let resolvedCpyBw = targetDevice.monthly_quota_copier_bw != null ? Number(targetDevice.monthly_quota_copier_bw) : Math.round((Number(targetDevice.monthly_quota_copier) || 200) * 0.8);
    let resolvedCpyCol = targetDevice.monthly_quota_copier_color != null ? Number(targetDevice.monthly_quota_copier_color) : Math.max(0, (Number(targetDevice.monthly_quota_copier) || 200) - resolvedCpyBw);
    if (monthly_quota_copier_bw !== undefined || monthly_quota_copier_color !== undefined) {
      if (monthly_quota_copier_bw !== undefined) resolvedCpyBw = Number(monthly_quota_copier_bw) || 0;
      if (monthly_quota_copier_color !== undefined) resolvedCpyCol = Number(monthly_quota_copier_color) || 0;
    } else if (monthly_quota_copier !== undefined) {
      const totalCpy = Number(monthly_quota_copier) || 0;
      resolvedCpyBw = Math.round(totalCpy * 0.8);
      resolvedCpyCol = Math.max(0, totalCpy - resolvedCpyBw);
    }
    const resolvedCpyTotal = resolvedCpyBw + resolvedCpyCol;

    // Check if the new user_code is different and already belongs to another device
    if (user_code && user_code !== targetDevice.user_code) {
        const otherDevice = await db('ricoh_device_quotas').where('user_code', user_code).first();
        if (otherDevice) {
            // SWAP their PINs, usage (including current_usage total), lifetimes, quotas, and copier lock statuses
            await db('ricoh_device_quotas').where('id', targetDevice.id).update({
                user_code: otherDevice.user_code,
                current_usage: otherDevice.current_usage,
                current_usage_bw: otherDevice.current_usage_bw,
                current_usage_color: otherDevice.current_usage_color,
                current_usage_copier_bw: otherDevice.current_usage_copier_bw,
                current_usage_copier_color: otherDevice.current_usage_copier_color,
                lifetime_bw: otherDevice.lifetime_bw,
                lifetime_color: otherDevice.lifetime_color,
                lifetime_copier_bw: otherDevice.lifetime_copier_bw,
                lifetime_copier_color: otherDevice.lifetime_copier_color,
                monthly_quota: otherDevice.monthly_quota,
                monthly_quota_bw: otherDevice.monthly_quota_bw,
                monthly_quota_color: otherDevice.monthly_quota_color,
                monthly_quota_copier_bw: otherDevice.monthly_quota_copier_bw,
                monthly_quota_copier_color: otherDevice.monthly_quota_copier_color,
                monthly_quota_copier: otherDevice.monthly_quota_copier,
                copier_status: otherDevice.copier_status,
                copier_bw_status: otherDevice.copier_bw_status,
                copier_color_status: otherDevice.copier_color_status,
                department_id: department_id || targetDevice.department_id || null
            });

            await db('ricoh_device_quotas').where('id', otherDevice.id).update({
                user_code: targetDevice.user_code,
                current_usage: targetDevice.current_usage,
                current_usage_bw: targetDevice.current_usage_bw,
                current_usage_color: targetDevice.current_usage_color,
                current_usage_copier_bw: targetDevice.current_usage_copier_bw,
                current_usage_copier_color: targetDevice.current_usage_copier_color,
                lifetime_bw: targetDevice.lifetime_bw,
                lifetime_color: targetDevice.lifetime_color,
                lifetime_copier_bw: targetDevice.lifetime_copier_bw,
                lifetime_copier_color: targetDevice.lifetime_copier_color,
                monthly_quota: targetDevice.monthly_quota,
                monthly_quota_bw: targetDevice.monthly_quota_bw,
                monthly_quota_color: targetDevice.monthly_quota_color,
                monthly_quota_copier_bw: targetDevice.monthly_quota_copier_bw,
                monthly_quota_copier_color: targetDevice.monthly_quota_copier_color,
                monthly_quota_copier: targetDevice.monthly_quota_copier,
                copier_status: targetDevice.copier_status,
                copier_bw_status: targetDevice.copier_bw_status,
                copier_color_status: targetDevice.copier_color_status
            });

            await generateExcelFile();
            await syncDepartmentQuotas(targetDevice.department_id);
            await syncDepartmentQuotas(otherDevice.department_id);
            return res.json({ updated: 2, swapped: true });
        }
    }

    const updatePayload = {
      monthly_quota_bw,
      monthly_quota_color,
      monthly_quota_copier_bw: resolvedCpyBw,
      monthly_quota_copier_color: resolvedCpyCol,
      monthly_quota_copier: resolvedCpyTotal,
      user_code,
      department_id: department_id || null,
      supervisor_hr_id: resolvedSupHrId,
      supervisor_name: resolvedSupName,
      supervisor_whatsapp: resolvedSupWa,
      wa_notify_mode: resolvedNotifyMode
    };

    const updated = await db('ricoh_device_quotas').where('id', req.params.id).update(updatePayload);

    await generateExcelFile();
    await syncDepartmentQuotas(targetDevice.department_id || department_id);

    // Check if new quota unblocks user
    try {
      const { checkAndEnforceCopierQuotas } = require('../services/ricoh_copier_lock');
      checkAndEnforceCopierQuotas();
    } catch(e) {}

    res.json({ updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/devices/quotas/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    await db('ricoh_device_quotas').where('id', req.params.id).update({ status });
    res.json({ message: `Device status updated to ${status}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/devices/quotas/:id/copier-status', async (req, res) => {
  try {
    const { status, mode } = req.body; // status: 'active'|'locked', mode?: 'bw'|'color'|'both'
    const targetDevice = await db('ricoh_device_quotas').where('id', req.params.id).first();
    if (!targetDevice) return res.status(404).json({ error: "Device not found" });

    let nextBw = targetDevice.copier_bw_status || (targetDevice.copier_status === 'locked' ? 'locked' : 'active');
    let nextColor = targetDevice.copier_color_status || (targetDevice.copier_status === 'locked' ? 'locked' : 'active');

    if (mode === 'bw') {
      nextBw = status;
    } else if (mode === 'color') {
      nextColor = status;
    } else {
      nextBw = status;
      nextColor = status;
    }

    const overall = (nextBw === 'locked' && nextColor === 'locked')
      ? 'locked'
      : ((nextBw === 'locked' || nextColor === 'locked') ? 'partial' : 'active');

    await db('ricoh_device_quotas').where('id', req.params.id).update({
      copier_bw_status: nextBw,
      copier_color_status: nextColor,
      copier_status: overall
    });

    // Push hardware update if user has PIN
    if (targetDevice.user_code) {
      try {
        const { syncCopierPermissionToPrinters } = require('../services/ricoh_copier_lock');
        syncCopierPermissionToPrinters(targetDevice.user_code, {
          allowBw: nextBw === 'active',
          allowColor: nextColor === 'active'
        }).catch(e => {
          console.error('[COPIER STATUS ERROR] Failed to push to hardware:', e.message);
        });
      } catch(e) {}
    }

    res.json({
      message: `Copier status updated (B/W: ${nextBw}, Color: ${nextColor})`,
      copier_status: overall,
      copier_bw_status: nextBw,
      copier_color_status: nextColor
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ricoh/block-unregistered-pins - Block Copy & Print on all Ricoh PINs not registered in app
router.post('/block-unregistered-pins', async (req, res) => {
  try {
    const org = req.organization || req.headers['x-organization'] || (process.env.PLANT_CODE || 'TCF-KG');
    const { lockUnregisteredRicohPins } = require('../services/ricoh_copier_lock');
    const result = await lockUnregisteredRicohPins(org);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});





router.delete('/devices/quotas/:id', async (req, res) => {


  try {


    await db('ricoh_device_quotas').where('id', req.params.id).del();


    await generateExcelFile();


    res.json({ message: 'Device quota policy deleted successfully' });


  } catch (err) {


    res.status(500).json({ error: err.message });


  }


});





router.post('/devices/quotas/reset-all', async (req, res) => {
  try {
    const targetOrg = req.query.org || req.headers['x-organization'] || req.organization || (process.env.PLANT_CODE || 'TCF-KG');
    const result = await performBillingCycleReset(null, targetOrg);
    await generateExcelFile(targetOrg);
    res.json({ message: `All device print quotas reset successfully for ${targetOrg} (21st billing cycle archived)`, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/billing-cycle/current', (req, res) => {
  try {
    res.json(getCurrentBillingCycle());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});





router.get('/devices/quotas/export-excel', async (req, res) => {


  try {


    const uniqueAssets = db('assets')
      .distinctOn('name')
      .orderBy('name')
      .orderBy('id', 'desc')
      .as('unique_assets');

    const rows = await db('ricoh_device_quotas')
      .leftJoin('assets', 'assets.id', db.raw('COALESCE(ricoh_device_quotas.asset_id, (SELECT a2.id FROM assets a2 WHERE a2.name = ricoh_device_quotas.computer_name LIMIT 1))'))
      .leftJoin('users', 'assets.user_id', 'users.id')
      .leftJoin('hr_employees as hr', 'assets.hr_employee_id', 'hr.id')
      .leftJoin('ricoh_departments', 'ricoh_device_quotas.department_id', 'ricoh_departments.id')
      .select(
        'ricoh_device_quotas.*',
        'assets.contact as inventory_contact',
        db.raw("COALESCE(hr.name, users.name, assets.contact, '-') as inventory_user_name"),
        db.raw("COALESCE(ricoh_departments.name, hr.department, users.department) as department_name")
      )
      .orderBy('ricoh_device_quotas.computer_name', 'asc');


      


    const data = rows.map(row => ({


      'Computer Name': row.computer_name,


      'Employee Name': row.inventory_user_name || row.inventory_contact || '-',


      'PIN (User Code)': row.user_code || '',


      'B/W Quota': row.monthly_quota_bw || 0,
      'Color Quota': row.monthly_quota_color || 0,
      'Copy B/W Quota': row.monthly_quota_copier_bw ?? (row.monthly_quota_copier || 0),
      'Copy Color Quota': row.monthly_quota_copier_color ?? 0,
      'Copy Total Quota': row.monthly_quota_copier || 0,
      'Print B/W Usage': Number(row.current_usage_bw) || 0,
      'Print Color Usage': Number(row.current_usage_color) || 0,
      'Copy B/W Usage': Number(row.current_usage_copier_bw) || 0,
      'Copy Color Usage': Number(row.current_usage_copier_color) || 0,
      'Total Print': (Number(row.current_usage_bw) || 0) + (Number(row.current_usage_color) || 0),
      'Total Copy': (Number(row.current_usage_copier_bw) || 0) + (Number(row.current_usage_copier_color) || 0),
      'Grand Total': (Number(row.current_usage_bw) || 0) + (Number(row.current_usage_color) || 0) + (Number(row.current_usage_copier_bw) || 0) + (Number(row.current_usage_copier_color) || 0),
      'Department': row.department_name || 'Unassigned',
      'Status': row.status || 'active'
    }));


    


    const ws = xlsx.utils.json_to_sheet(data);


    const wb = xlsx.utils.book_new();


    xlsx.utils.book_append_sheet(wb, ws, "Ricoh Quotas");


    


    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });


    


    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');


    res.setHeader('Content-Disposition', 'attachment; filename="ricoh_quotas_report.xlsx"');


    res.status(200).send(buffer);


  } catch (err) {


    res.status(500).json({ error: err.message });


  }


});






// ==========================================
// USER / DEVICE DETAILED PRINT ACTIVITY & AUDIT REPORT
// ==========================================

// Generic corporate keywords to exclude from broad fuzzy ILIKE matching
const GENERIC_FILTER_WORDS = new Set([
  'administrator', 'admin', 'user', 'guest', 'none', 'null', 'device', 'default', 
  'desktop', 'unassigned', 'tcf2', 'tcfsg', 'tcfkg', 'domain', 'local', 'corp', 'company'
]);

function buildUserJobMatchingQuery(queryBuilder, profile) {
  const terms = new Set();
  if (profile.computer_name && !GENERIC_FILTER_WORDS.has(profile.computer_name.toLowerCase())) {
    terms.add(profile.computer_name.trim());
  }
  if (profile.user_code && String(profile.user_code).trim() && String(profile.user_code).trim() !== '0') {
    terms.add(String(profile.user_code).trim());
  }
  if (profile.inventory_user_name && profile.inventory_user_name !== '-') {
    const parts = profile.inventory_user_name.trim().split(/\s+/);
    parts.forEach(p => {
      if (p.length >= 4 && !GENERIC_FILTER_WORDS.has(p.toLowerCase())) {
        terms.add(p);
      }
    });
  }
  if (profile.windows_login) {
    const parts = profile.windows_login.replace(/[\\/,@]+/g, ' ').split(/\s+/);
    parts.forEach(p => {
      if (p.length >= 4 && !GENERIC_FILTER_WORDS.has(p.toLowerCase())) {
        terms.add(p);
      }
    });
  }
  if (profile.inventory_contact) {
    const parts = profile.inventory_contact.replace(/[\\/,@]+/g, ' ').split(/\s+/);
    parts.forEach(p => {
      if (p.length >= 4 && !GENERIC_FILTER_WORDS.has(p.toLowerCase())) {
        terms.add(p);
      }
    });
  }

  return queryBuilder.where(function() {
    let first = true;
    for (const term of terms) {
      if (first) {
        this.where('ricoh_print_jobs.user_name', 'ilike', `%${term}%`)
            .orWhere('ricoh_print_jobs.user_id', 'ilike', `%${term}%`);
        first = false;
      } else {
        this.orWhere('ricoh_print_jobs.user_name', 'ilike', `%${term}%`)
            .orWhere('ricoh_print_jobs.user_id', 'ilike', `%${term}%`);
      }
    }
    if (first) {
      this.where('ricoh_print_jobs.user_name', profile.computer_name);
    }
  });
}

router.get('/reports/user-details', async (req, res) => {
  try {
    const { computer_name, user_id, user_name } = req.query;
    if (!computer_name && !user_id && !user_name) {
      return res.status(400).json({ error: 'computer_name, user_name, or user_id required' });
    }

    let profileQuery = db('ricoh_device_quotas')
      .leftJoin('assets', 'assets.id', db.raw('COALESCE(ricoh_device_quotas.asset_id, (SELECT a2.id FROM assets a2 WHERE a2.name = ricoh_device_quotas.computer_name LIMIT 1))'))
      .leftJoin('users', 'assets.user_id', 'users.id')
      .leftJoin('hr_employees as hr', 'assets.hr_employee_id', 'hr.id')
      .leftJoin('ricoh_departments', 'ricoh_device_quotas.department_id', 'ricoh_departments.id')
      .select(
        'ricoh_device_quotas.*',
        'assets.contact as inventory_contact',
        'assets.windows_login',
        db.raw("COALESCE(hr.phone, '') as user_whatsapp"),
        'assets.ip_address as inventory_ip',
        db.raw("COALESCE(hr.name, users.name, assets.contact, '-') as inventory_user_name"),
        db.raw("COALESCE(ricoh_departments.name, hr.department, users.department, 'Unassigned') as department_name")
      );

    if (computer_name) {
      profileQuery = profileQuery.where(function() {
        this.where('ricoh_device_quotas.computer_name', computer_name)
          .orWhere('ricoh_device_quotas.computer_name', 'ilike', '%' + computer_name + '%')
          .orWhere('assets.contact', 'ilike', '%' + computer_name + '%')
          .orWhere('hr.name', 'ilike', '%' + computer_name + '%');
      });
    } else if (user_name) {
      profileQuery = profileQuery.where(function() {
        this.where('hr.name', 'ilike', '%' + user_name + '%')
          .orWhere('users.name', 'ilike', '%' + user_name + '%')
          .orWhere('assets.contact', 'ilike', '%' + user_name + '%')
          .orWhere('ricoh_device_quotas.computer_name', 'ilike', '%' + user_name + '%');
      });
    } else {
      profileQuery = profileQuery.where('ricoh_device_quotas.id', user_id);
    }

    const profile = await profileQuery.first();
    if (!profile) {
      return res.status(404).json({ error: 'Device or User not found' });
    }

    const targetName = profile.computer_name;
    const userName = profile.inventory_user_name || '';

    const todayStats = await db('ricoh_print_jobs')
      .where(function() {
        buildUserJobMatchingQuery(this, profile);
      })
      .where('created_at', '>=', db.raw("CURRENT_DATE"))
      .select(
        db.raw('COUNT(*) as total_jobs'),
        db.raw('COALESCE(SUM(pages), 0) as total_pages')
      )
      .first();

    const weekStats = await db('ricoh_print_jobs')
      .where(function() {
        buildUserJobMatchingQuery(this, profile);
      })
      .where('created_at', '>=', db.raw("CURRENT_DATE - INTERVAL '7 days'"))
      .select(
        db.raw('COUNT(*) as total_jobs'),
        db.raw('COALESCE(SUM(pages), 0) as total_pages')
      )
      .first();

    const jobs = await db('ricoh_print_jobs')
      .leftJoin('ricoh_devices', 'ricoh_print_jobs.printer_ip', 'ricoh_devices.ip')
      .where(function() {
        buildUserJobMatchingQuery(this, profile);
      })
      .select(
        'ricoh_print_jobs.id',
        'ricoh_print_jobs.document_name',
        'ricoh_print_jobs.user_name',
        'ricoh_print_jobs.user_id',
        'ricoh_print_jobs.pages',
        'ricoh_print_jobs.status',
        'ricoh_print_jobs.created_at',
        'ricoh_print_jobs.timestamp',
        'ricoh_print_jobs.printer_ip',
        'ricoh_devices.name as printer_name'
      )
      .orderBy('ricoh_print_jobs.id', 'desc')
      .limit(200);

    const logs = await db('ricoh_system_logs')
      .where(function() {
        this.where('message', 'ilike', `%${targetName}%`);
        if (userName && userName !== '-') {
          this.orWhere('message', 'ilike', `%${userName}%`);
        }
      })
      .orderBy('timestamp', 'desc')
      .limit(50);

    res.json({
      success: true,
      profile: {
        id: profile.id,
        computer_name: profile.computer_name,
        user_name: profile.inventory_user_name,
        contact: profile.inventory_contact,
        department: profile.department_name,
        user_code: profile.user_code,
        status: profile.status,
        copier_status: profile.copier_status,
        ip_address: profile.ip_address || profile.inventory_ip,
        user_whatsapp: profile.user_whatsapp,
        monthly_quota_bw: profile.monthly_quota_bw != null ? Number(profile.monthly_quota_bw) : 1000,
        current_usage_bw: profile.current_usage_bw || 0,
        monthly_quota_color: profile.monthly_quota_color != null ? Number(profile.monthly_quota_color) : 500,
        current_usage_color: profile.current_usage_color || 0,
        monthly_quota_copier: profile.monthly_quota_copier != null ? Number(profile.monthly_quota_copier) : 200,
        current_usage_copier_bw: profile.current_usage_copier_bw || 0,
        total_usage_cycle: (Number(profile.current_usage_bw) || 0) + (Number(profile.current_usage_color) || 0) + (Number(profile.current_usage_copier_bw) || 0)
      },
      stats: {
        today_jobs: Number(todayStats?.total_jobs || 0),
        today_pages: Number(todayStats?.total_pages || 0),
        week_jobs: Number(weekStats?.total_jobs || 0),
        week_pages: Number(weekStats?.total_pages || 0)
      },
      jobs,
      logs
    });
  } catch (err) {
    console.error('Error fetching user print details:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/reports/user-details/export', async (req, res) => {
  try {
    const { computer_name, user_id, user_name } = req.query;
    if (!computer_name && !user_id && !user_name) {
      return res.status(400).json({ error: 'computer_name, user_name, or user_id required' });
    }

    let profileQuery = db('ricoh_device_quotas')
      .leftJoin('assets', 'assets.id', db.raw('COALESCE(ricoh_device_quotas.asset_id, (SELECT a2.id FROM assets a2 WHERE a2.name = ricoh_device_quotas.computer_name LIMIT 1))'))
      .leftJoin('users', 'assets.user_id', 'users.id')
      .leftJoin('hr_employees as hr', 'assets.hr_employee_id', 'hr.id')
      .leftJoin('ricoh_departments', 'ricoh_device_quotas.department_id', 'ricoh_departments.id')
      .select(
        'ricoh_device_quotas.*',
        'assets.contact as inventory_contact',
        'assets.windows_login',
        db.raw("COALESCE(hr.phone, '') as user_whatsapp"),
        'assets.ip_address as inventory_ip',
        db.raw("COALESCE(hr.name, users.name, assets.contact, '-') as inventory_user_name"),
        db.raw("COALESCE(ricoh_departments.name, hr.department, users.department, 'Unassigned') as department_name")
      );

    if (computer_name) {
      profileQuery = profileQuery.where(function() {
        this.where('ricoh_device_quotas.computer_name', computer_name)
          .orWhere('ricoh_device_quotas.computer_name', 'ilike', '%' + computer_name + '%')
          .orWhere('assets.contact', 'ilike', '%' + computer_name + '%')
          .orWhere('hr.name', 'ilike', '%' + computer_name + '%');
      });
    } else if (user_name) {
      profileQuery = profileQuery.where(function() {
        this.where('hr.name', 'ilike', '%' + user_name + '%')
          .orWhere('users.name', 'ilike', '%' + user_name + '%')
          .orWhere('assets.contact', 'ilike', '%' + user_name + '%')
          .orWhere('ricoh_device_quotas.computer_name', 'ilike', '%' + user_name + '%');
      });
    } else {
      profileQuery = profileQuery.where('ricoh_device_quotas.id', user_id);
    }

    const profile = await profileQuery.first();
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    const targetName = profile.computer_name;
    const userName = profile.inventory_user_name || '';

    const jobs = await db('ricoh_print_jobs')
      .leftJoin('ricoh_devices', 'ricoh_print_jobs.printer_ip', 'ricoh_devices.ip')
      .where(function() {
        buildUserJobMatchingQuery(this, profile);
      })
      .select(
        'ricoh_print_jobs.document_name',
        'ricoh_print_jobs.pages',
        'ricoh_print_jobs.created_at',
        'ricoh_print_jobs.timestamp',
        'ricoh_print_jobs.user_name as pc_login',
        'ricoh_print_jobs.user_id as user_auth',
        'ricoh_devices.name as printer_name',
        'ricoh_print_jobs.status'
      )
      .orderBy('ricoh_print_jobs.id', 'desc')
      .limit(1000);

    const targetOrg = req.query.org || req.headers['x-organization'] || req.organization || (process.env.PLANT_CODE || 'TCF-KG');
    const summaryData = [
      { Parameter: 'Cabang / Lokasi Plant', Nilai: targetOrg === 'TCF-KG' ? 'PT. Tri Centrum Fortuna - Plant Karawang (KG)' : 'PT. Tri Centrum Fortuna - Plant Sadang (SG)' },
      { Parameter: 'Nama Komputer / Hostname', Nilai: profile.computer_name },
      { Parameter: 'Nama Pengguna / Employee', Nilai: profile.inventory_user_name || '-' },
      { Parameter: 'Departemen', Nilai: profile.department_name },
      { Parameter: 'PIN Ricoh', Nilai: profile.user_code || '-' },
      { Parameter: 'Status Cetak', Nilai: profile.status || 'Active' },
      { Parameter: 'Status Fotokopi', Nilai: profile.copier_status || 'Active' },
      { Parameter: 'WhatsApp', Nilai: profile.user_whatsapp || '-' },
      { Parameter: '---', Nilai: '---' },
      { Parameter: 'Kuota B/W Siklus Ini', Nilai: `${profile.current_usage_bw || 0} / ${profile.monthly_quota_bw || 1000} lembar` },
      { Parameter: 'Kuota Warna Siklus Ini', Nilai: `${profile.current_usage_color || 0} / ${profile.monthly_quota_color || 500} lembar` },
      { Parameter: 'Kuota Fotokopi Siklus Ini', Nilai: `${profile.current_usage_copier_bw || 0} / ${profile.monthly_quota_copier || 200} lembar` },
      { Parameter: 'Total Pemakaian Siklus', Nilai: `${(Number(profile.current_usage_bw)||0) + (Number(profile.current_usage_color)||0) + (Number(profile.current_usage_copier_bw)||0)} lembar` }
    ];

    const jobsData = jobs.map((j, idx) => ({
      No: idx + 1,
      'Waktu Cetak': j.created_at ? new Date(j.created_at).toLocaleString('id-ID') : (j.timestamp || '-'),
      'Nama Dokumen': j.document_name || 'Document',
      'PC Login': j.pc_login || '-',
      'User Auth / PIN': j.user_auth || '-',
      'Mesin Printer': j.printer_name || (targetOrg === 'TCF-KG' ? 'KG-1' : 'TCF-SG'),
      'Jumlah Halaman': j.pages || 1,
      'Status': j.status || 'Complete'
    }));

    const wb = xlsx.utils.book_new();
    const wsSummary = xlsx.utils.json_to_sheet(summaryData);
    const wsJobs = xlsx.utils.json_to_sheet(jobsData);

    xlsx.utils.book_append_sheet(wb, wsSummary, 'Ringkasan Profil & Kuota');
    xlsx.utils.book_append_sheet(wb, wsJobs, 'Riwayat Dokumen Cetak');

    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const cleanFilename = `Report_Print_${profile.computer_name}_${new Date().toISOString().slice(0,10)}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${cleanFilename}"`);
    return res.send(buffer);
  } catch (err) {
    console.error('Error generating Excel report:', err);
    res.status(500).json({ error: err.message });
  }
});


router.get('/devices/status', async (req, res) => {


  try {


    // Get latest toner log for each device using PostgreSQL features (DISTINCT ON is standard for this in PG)


    const result = await db.raw(`


      SELECT d.id, d.name, d.ip, d.model, d.status,


             t.cyan, t.magenta, t.yellow, t.black, t.timestamp


      FROM ricoh_devices d


      LEFT JOIN (


        SELECT DISTINCT ON (device_id) device_id, cyan, magenta, yellow, black, timestamp


        FROM ricoh_toner_logs


        ORDER BY device_id, timestamp DESC


      ) t ON d.id = t.device_id


    `);


    res.json(result.rows || result);


  } catch (err) {


    res.status(500).json({ error: err.message });


  }


});











// GET /api/ricoh/executive-summary - Unified accurate KPIs, Daily/Monthly Charts, Dept & Cost Analytics
router.get('/executive-summary', async (req, res) => {
  try {
    const targetOrg = req.query.org || req.headers['x-organization'] || req.organization || (process.env.PLANT_CODE || 'TCF-KG');
    const orgDb = db.getDb ? db.getDb(targetOrg) : db;
    const cycle = getCurrentBillingCycle();

    const RATE_BW = 100;
    const RATE_COLOR = 1400;
    const BASE_FEE = 1900000;
    const FREE_BW = 1000;
    const FREE_COLOR = 100;

    const calcContractCost = (bwAll, colAll) => {
      const overBw = Math.max(0, bwAll - FREE_BW) * RATE_BW;
      const overCol = Math.max(0, colAll - FREE_COLOR) * RATE_COLOR;
      return {
        baseFee: BASE_FEE,
        overBw,
        overCol,
        totalNonPpn: BASE_FEE + overBw + overCol
      };
    };

    // Today & 7-day boundaries in Asia/Jakarta (UTC+7)
    const nowJkt = new Date(Date.now() + 7 * 3600 * 1000);
    const todayStr = nowJkt.toISOString().slice(0, 10);
    const weekStartDate = new Date(nowJkt);
    weekStartDate.setUTCDate(weekStartDate.getUTCDate() - 6);
    const weekStartStr = weekStartDate.toISOString().slice(0, 10);
    const seriesStartDate = new Date(nowJkt);
    seriesStartDate.setUTCDate(seriesStartDate.getUTCDate() - 13);
    const seriesStartStr = seriesStartDate.toISOString().slice(0, 10);

    // 1. Live Device Quotas + Department + User identity
    const devRows = await orgDb('ricoh_device_quotas as rdq')
      .leftJoin('ricoh_departments as rd', 'rdq.department_id', 'rd.id')
      .leftJoin('assets as a', orgDb.raw('a.id = COALESCE(rdq.asset_id, (SELECT a2.id FROM assets a2 WHERE LOWER(TRIM(a2.name)) = LOWER(TRIM(rdq.computer_name)) LIMIT 1))'))
      .leftJoin('users as u', 'a.user_id', 'u.id')
      .leftJoin('hr_employees as hr', function() {
        this.on('a.hr_employee_id', '=', 'hr.id').orOn('u.hr_employee_id', '=', 'hr.id');
      })
      .select(
        'rdq.*',
        orgDb.raw("COALESCE(rd.name, hr.department, u.department, 'General') as resolved_dept"),
        orgDb.raw("COALESCE(hr.name, u.name, a.contact, 'Unassigned') as resolved_user")
      );

    let qPrtBw = 0, qPrtCol = 0, qCpyBw = 0, qCpyCol = 0;
    let uPrtBw = 0, uPrtCol = 0, uCpyBw = 0, uCpyCol = 0;
    let activeDevs = 0;
    const deptAgg = {};
    const topUsersRaw = [];

    for (const d of devRows) {
      const dqBw = d.monthly_quota_bw != null ? Number(d.monthly_quota_bw) : 1000;
      const dqCol = d.monthly_quota_color != null ? Number(d.monthly_quota_color) : 500;
      const fbCpy = d.monthly_quota_copier != null ? Number(d.monthly_quota_copier) : 200;
      const dqCbw = d.monthly_quota_copier_bw != null ? Number(d.monthly_quota_copier_bw) : Math.round(fbCpy * 0.8);
      const dqCcol = d.monthly_quota_copier_color != null ? Number(d.monthly_quota_copier_color) : Math.max(0, fbCpy - dqCbw);
      const dqTot = dqBw + dqCol + dqCbw + dqCcol;

      const duBw = Number(d.current_usage_bw) || 0;
      const duCol = Number(d.current_usage_color) || 0;
      const duCbw = Number(d.current_usage_copier_bw) || 0;
      const duCcol = Number(d.current_usage_copier_color) || 0;
      const duTot = duBw + duCol + duCbw + duCcol;

      qPrtBw += dqBw; qPrtCol += dqCol; qCpyBw += dqCbw; qCpyCol += dqCcol;
      uPrtBw += duBw; uPrtCol += duCol; uCpyBw += duCbw; uCpyCol += duCcol;
      if (duTot > 0) activeDevs += 1;

      const dp = d.resolved_dept || 'General';
      if (!deptAgg[dp]) {
        deptAgg[dp] = {
          name: dp, pc_count: 0, active_pc: 0,
          q_prt_bw: 0, q_prt_col: 0, q_cpy_bw: 0, q_cpy_col: 0, q_total: 0,
          u_prt_bw: 0, u_prt_col: 0, u_cpy_bw: 0, u_cpy_col: 0, u_total: 0,
          bw_all: 0, col_all: 0, cost_bw: 0, cost_color: 0, cost_total: 0
        };
      }
      const g = deptAgg[dp];
      g.pc_count += 1;
      if (duTot > 0) g.active_pc += 1;
      g.q_prt_bw += dqBw; g.q_prt_col += dqCol; g.q_cpy_bw += dqCbw; g.q_cpy_col += dqCcol; g.q_total += dqTot;
      g.u_prt_bw += duBw; g.u_prt_col += duCol; g.u_cpy_bw += duCbw; g.u_cpy_col += duCcol; g.u_total += duTot;
      const bwAllD = duBw + duCbw;
      const colAllD = duCol + duCcol;
      g.bw_all += bwAllD;
      g.col_all += colAllD;
      g.cost_bw += bwAllD * RATE_BW;
      g.cost_color += colAllD * RATE_COLOR;
      g.cost_total = g.cost_bw + g.cost_color;

      topUsersRaw.push({
        computer_name: d.computer_name,
        user_name: d.resolved_user,
        department: dp,
        ...(req.user ? { pin: d.user_code || '-' } : {}),
        status: d.status || 'active',
        u_prt_bw: duBw, u_prt_col: duCol, u_cpy_bw: duCbw, u_cpy_col: duCcol, u_total: duTot,
        q_total: dqTot,
        cost_bw: bwAllD * RATE_BW,
        cost_color: colAllD * RATE_COLOR,
        cost_total: (bwAllD * RATE_BW) + (colAllD * RATE_COLOR)
      });
    }

    const departmentBreakdown = Object.values(deptAgg)
      .map(d => ({
        ...d,
        utilization_pct: d.q_total > 0 ? Number(((d.u_total / d.q_total) * 100).toFixed(1)) : 0
      }))
      .sort((a, b) => b.u_total - a.u_total);

    const topUsers = topUsersRaw
      .filter(u => u.u_total > 0)
      .sort((a, b) => b.u_total - a.u_total)
      .slice(0, 12);

    // 2. Daily Series (14 days cleanly from ricoh_daily_usage)
    const dailyRows = await orgDb('ricoh_daily_usage')
      .where('date', '>=', seriesStartStr)
      .andWhere('date', '<=', todayStr)
      .groupBy('date')
      .select(
        'date',
        orgDb.raw('COALESCE(SUM(bw_usage),0)::int as bw'),
        orgDb.raw('COALESCE(SUM(color_usage),0)::int as color'),
        orgDb.raw('COALESCE(SUM(copier_bw_usage),0)::int as copier_bw'),
        orgDb.raw('COALESCE(SUM(copier_color_usage),0)::int as copier_color')
      )
      .orderBy('date', 'asc');

    const dailyMap = {};
    for (const r of dailyRows) {
      dailyMap[String(r.date).slice(0, 10)] = r;
    }

    const monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const dailySeries = [];
    let todayStat = { bw: 0, color: 0, copier_bw: 0, copier_color: 0, total: 0 };
    let weekStat = { bw: 0, color: 0, copier_bw: 0, copier_color: 0, total: 0 };

    for (let i = 13; i >= 0; i--) {
      const dt = new Date(nowJkt);
      dt.setUTCDate(dt.getUTCDate() - i);
      const ymd = dt.toISOString().slice(0, 10);
      const row = dailyMap[ymd] || {};
      const bw = Number(row.bw) || 0;
      const color = Number(row.color) || 0;
      const cbw = Number(row.copier_bw) || 0;
      const ccol = Number(row.copier_color) || 0;
      const bwAll = bw + cbw;
      const colAll = color + ccol;
      const total = bwAll + colAll;
      const costRp = (bwAll * RATE_BW) + (colAll * RATE_COLOR);

      const mNum = parseInt(ymd.slice(5, 7), 10) - 1;
      dailySeries.push({
        date: ymd,
        label: `${ymd.slice(8, 10)} ${monthsShort[mNum] || ''}`,
        print_bw: bw,
        print_color: color,
        copy_bw: cbw,
        copy_color: ccol,
        bw_all: bwAll,
        col_all: colAll,
        total,
        cost_rp: costRp
      });

      if (ymd === todayStr) {
        todayStat = { bw, color, copier_bw: cbw, copier_color: ccol, bw_all: bwAll, col_all: colAll, total };
      }
      if (ymd >= weekStartStr) {
        weekStat.bw += bw;
        weekStat.color += color;
        weekStat.copier_bw += cbw;
        weekStat.copier_color += ccol;
        weekStat.total += total;
      }
    }

    // 3. Monthly History + Active Cycle Series
    const monthlyAgg = await orgDb('ricoh_monthly_usage')
      .select('month')
      .sum({ bw: 'bw_usage', color: 'color_usage', cbw: 'copier_bw_usage', ccol: 'copier_color_usage' })
      .groupBy('month')
      .orderBy('month', 'asc');

    const monthlySeries = monthlyAgg.map(m => {
      const bw = Number(m.bw) || 0;
      const color = Number(m.color) || 0;
      const cbw = Number(m.cbw) || 0;
      const ccol = Number(m.ccol) || 0;
      const bwAll = bw + cbw;
      const colAll = color + ccol;
      const cc = calcContractCost(bwAll, colAll);
      const [yr, mo] = String(m.month || '').split('-');
      const mIdx = (parseInt(mo, 10) || 1) - 1;
      return {
        month: m.month,
        label: `${monthsShort[mIdx] || mo} ${yr || ''}`.trim(),
        bw,
        color,
        copier_bw: cbw,
        copier_color: ccol,
        bw_all: bwAll,
        col_all: colAll,
        print_total: bw + color,
        copy_total: cbw + ccol,
        total: bwAll + colAll,
        cost_bw: bwAll * RATE_BW,
        cost_color: colAll * RATE_COLOR,
        bill_non_ppn: cc.totalNonPpn,
        is_active: false
      };
    });

    // Append active billing cycle as latest bar
    const cycBwAll = uPrtBw + uCpyBw;
    const cycColAll = uPrtCol + uCpyCol;
    const cycContract = calcContractCost(cycBwAll, cycColAll);
    const [cYr, cMo] = String(cycle.billingMonth).split('-');
    const cMIdx = (parseInt(cMo, 10) || 1) - 1;
    monthlySeries.push({
      month: cycle.billingMonth,
      label: `${monthsShort[cMIdx] || cMo} ${cYr} (Aktif)`,
      bw: uPrtBw,
      color: uPrtCol,
      copier_bw: uCpyBw,
      copier_color: uCpyCol,
      bw_all: cycBwAll,
      col_all: cycColAll,
      print_total: uPrtBw + uPrtCol,
      copy_total: uCpyBw + uCpyCol,
      total: cycBwAll + cycColAll,
      cost_bw: cycBwAll * RATE_BW,
      cost_color: cycColAll * RATE_COLOR,
      bill_non_ppn: cycContract.totalNonPpn,
      is_active: true
    });

    const qTotalAll = qPrtBw + qPrtCol + qCpyBw + qCpyCol;
    const uTotalAll = uPrtBw + uPrtCol + uCpyBw + uCpyCol;

    res.json({
      org: targetOrg,
      cycle,
      contractPricing: { rateBw: RATE_BW, rateColor: RATE_COLOR, monthlyBaseFee: BASE_FEE, freeBwPerMonth: FREE_BW, freeColorPerMonth: FREE_COLOR },
      kpis: {
        today: todayStat,
        week: weekStat,
        cycle: {
          u_prt_bw: uPrtBw,
          u_prt_col: uPrtCol,
          u_cpy_bw: uCpyBw,
          u_cpy_col: uCpyCol,
          bw_all: cycBwAll,
          col_all: cycColAll,
          u_total: uTotalAll,
          q_prt_bw: qPrtBw,
          q_prt_col: qPrtCol,
          q_cpy_bw: qCpyBw,
          q_cpy_col: qCpyCol,
          q_total: qTotalAll,
          utilization_pct: qTotalAll > 0 ? Number(((uTotalAll / qTotalAll) * 100).toFixed(1)) : 0,
          active_devices: activeDevs,
          total_devices: devRows.length,
          cost_bw_gross: cycBwAll * RATE_BW,
          cost_col_gross: cycColAll * RATE_COLOR,
          cost_total_gross: (cycBwAll * RATE_BW) + (cycColAll * RATE_COLOR),
          contract_cost: cycContract
        }
      },
      dailySeries,
      monthlySeries,
      departmentBreakdown,
      topUsers
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/monthly-stats', async (req, res) => {
  try {
    const cycle = getCurrentBillingCycle();
    const prevCycle = getPreviousBillingCycle();

    const active = await db('ricoh_device_quotas').sum({ 
      bw: 'current_usage_bw', 
      color: 'current_usage_color', 
      cbw: 'current_usage_copier_bw', 
      ccolor: 'current_usage_copier_color' 
    }).first();
    
    let lastM = await db('ricoh_monthly_usage')
      .where('month', prevCycle.billingMonth)
      .sum({ bw: 'bw_usage', color: 'color_usage', cbw: 'copier_bw_usage', ccolor: 'copier_color_usage' })
      .first();

    if (!lastM || (!Number(lastM.bw) && !Number(lastM.color) && !Number(lastM.cbw) && !Number(lastM.ccolor))) {
      lastM = await db('ricoh_daily_usage')
        .where('date', '>=', prevCycle.startDate)
        .andWhere('date', '<=', prevCycle.endDate)
        .sum({ bw: 'bw_usage', color: 'color_usage', cbw: 'copier_bw_usage', ccolor: 'copier_color_usage' })
        .first();
    }
    
    const thisYearStr = new Date().getFullYear() + '-%';
    const thisY = await db('ricoh_monthly_usage').where('month', 'like', thisYearStr).sum({ bw: 'bw_usage', color: 'color_usage', cbw: 'copier_bw_usage', ccolor: 'copier_color_usage' }).first();
    
    res.json({
        billingCycle: cycle,
        prevBillingCycle: prevCycle,
        thisMonth: { 
            bw: Number(active?.bw) || 0, color: Number(active?.color) || 0,
            cbw: Number(active?.cbw) || 0, ccolor: Number(active?.ccolor) || 0
        },
        lastMonth: { 
            bw: Number(lastM?.bw) || 0, color: Number(lastM?.color) || 0,
            cbw: Number(lastM?.cbw) || 0, ccolor: Number(lastM?.ccolor) || 0
        },
        thisYear: { 
            bw: (Number(thisY?.bw) || 0) + (Number(active?.bw) || 0), 
            color: (Number(thisY?.color) || 0) + (Number(active?.color) || 0),
            cbw: (Number(thisY?.cbw) || 0) + (Number(active?.cbw) || 0), 
            ccolor: (Number(thisY?.ccolor) || 0) + (Number(active?.ccolor) || 0)
        }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/monthly-logs', async (req, res) => {
  try {
    const targetOrg = req.query.org || req.headers['x-organization'] || req.organization || (process.env.PLANT_CODE || 'TCF-KG');
    const orgDb = db.getDb ? db.getDb(targetOrg) : db;
    const cycle = getCurrentBillingCycle();

    // Active cycle uses authoritative ricoh_device_quotas counters so Monthly Reports matches Live & Management PDF 100%
    const currentRows = await orgDb('ricoh_device_quotas as rdq')
      .leftJoin('ricoh_departments as rd', 'rdq.department_id', 'rd.id')
      .leftJoin('assets as a', orgDb.raw('a.id = COALESCE(rdq.asset_id, (SELECT a2.id FROM assets a2 WHERE LOWER(TRIM(a2.name)) = LOWER(TRIM(rdq.computer_name)) LIMIT 1))'))
      .leftJoin('users as u', 'a.user_id', 'u.id')
      .leftJoin('hr_employees as hr', function() {
        this.on('a.hr_employee_id', '=', 'hr.id').orOn('u.hr_employee_id', '=', 'hr.id');
      })
      .select(
        'rdq.computer_name',
        'rdq.user_code',
        orgDb.raw("COALESCE(rd.name, hr.department, u.department, 'General') as department_name"),
        orgDb.raw("COALESCE(hr.name, u.name, a.contact, '-') as inventory_user_name"),
        'a.contact as inventory_contact',
        orgDb.raw('COALESCE(rdq.current_usage_bw, 0)::int as bw_usage'),
        orgDb.raw('COALESCE(rdq.current_usage_color, 0)::int as color_usage'),
        orgDb.raw('COALESCE(rdq.current_usage_copier_bw, 0)::int as copier_bw_usage'),
        orgDb.raw('COALESCE(rdq.current_usage_copier_color, 0)::int as copier_color_usage')
      );

    const formattedCurrentRows = currentRows
      .filter(r => (Number(r.bw_usage) + Number(r.color_usage) + Number(r.copier_bw_usage) + Number(r.copier_color_usage)) > 0)
      .map(r => ({
        ...r,
        id: 'curr_' + r.computer_name,
        month: cycle.billingMonth + ` (${cycle.label} - Aktif)`
      }));

    const historicalRows = await orgDb('ricoh_monthly_usage as m')
      .leftJoin('ricoh_device_quotas as rdq', 'm.computer_name', 'rdq.computer_name')
      .leftJoin('ricoh_departments as rd', orgDb.raw('COALESCE(rdq.department_id, m.department_id) = rd.id'))
      .leftJoin('assets as a', orgDb.raw('a.id = COALESCE(rdq.asset_id, (SELECT a2.id FROM assets a2 WHERE LOWER(TRIM(a2.name)) = LOWER(TRIM(m.computer_name)) LIMIT 1))'))
      .leftJoin('users as u', 'a.user_id', 'u.id')
      .leftJoin('hr_employees as hr', function() {
        this.on('a.hr_employee_id', '=', 'hr.id').orOn('u.hr_employee_id', '=', 'hr.id');
      })
      .select(
        'm.*',
        orgDb.raw('COALESCE(rdq.user_code, m.user_code) as user_code'),
        orgDb.raw("COALESCE(rd.name, hr.department, u.department, 'General') as department_name"),
        orgDb.raw("COALESCE(hr.name, u.name, a.contact, '-') as inventory_user_name"),
        'a.contact as inventory_contact'
      )
      .orderBy('m.month', 'desc')
      .orderBy('m.bw_usage', 'desc');

    const combinedMonthly = [...formattedCurrentRows, ...historicalRows];
    res.json(req.user ? combinedMonthly : combinedMonthly.map(r => ({ ...r, user_code: null })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/custom-range-logs', async (req, res) => {
  try {
    const { start, end } = req.query;
    if (!start || !end) return res.status(400).json({ error: 'Missing start or end date' });
    const targetOrg = req.query.org || req.headers['x-organization'] || req.organization || (process.env.PLANT_CODE || 'TCF-KG');
    const orgDb = db.getDb ? db.getDb(targetOrg) : db;

    const rows = await orgDb('ricoh_daily_usage as du')
      .leftJoin('ricoh_device_quotas as rdq', 'du.computer_name', 'rdq.computer_name')
      .leftJoin('ricoh_departments as rd', orgDb.raw('COALESCE(rdq.department_id, du.department_id) = rd.id'))
      .leftJoin('assets as a', orgDb.raw('a.id = COALESCE(rdq.asset_id, (SELECT a2.id FROM assets a2 WHERE LOWER(TRIM(a2.name)) = LOWER(TRIM(du.computer_name)) LIMIT 1))'))
      .leftJoin('users as u', 'a.user_id', 'u.id')
      .leftJoin('hr_employees as hr', function() {
        this.on('a.hr_employee_id', '=', 'hr.id').orOn('u.hr_employee_id', '=', 'hr.id');
      })
      .select(
        'du.computer_name',
        orgDb.raw('MAX(COALESCE(rdq.user_code, du.user_code)) as user_code'),
        orgDb.raw("MAX(COALESCE(rd.name, hr.department, u.department, 'General')) as department_name"),
        orgDb.raw("MAX(COALESCE(hr.name, u.name, a.contact, '-')) as inventory_user_name"),
        orgDb.raw("MAX(a.contact) as inventory_contact")
      )
      .sum('du.bw_usage as bw_usage')
      .sum('du.color_usage as color_usage')
      .sum('du.copier_bw_usage as copier_bw_usage')
      .sum('du.copier_color_usage as copier_color_usage')
      .where('du.date', '>=', start)
      .where('du.date', '<=', end)
      .groupBy('du.computer_name');

    const formattedRows = rows.map(r => ({
      ...r,
      ...(req.user ? {} : { user_code: null }),
      month: `${start} to ${end}`,
      id: `custom_${r.computer_name}`
    })).filter(r => (Number(r.bw_usage) + Number(r.color_usage) + Number(r.copier_bw_usage) + Number(r.copier_color_usage)) > 0);

    res.json(formattedRows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/ricoh/management-report-data - Flexible data endpoint for Executive Management PDF (Active Cycle / 1-N Months / Custom Date-Time Range)
router.get('/management-report-data', async (req, res) => {
  try {
    const targetOrg = req.query.org || req.headers['x-organization'] || req.organization || (process.env.PLANT_CODE || 'TCF-KG');
    const orgDb = db.getDb ? db.getDb(targetOrg) : db;
    const cycle = getCurrentBillingCycle();

    const mode = req.query.mode || 'meta';

    // Always collect available months (archived + active billingMonth)
    const archivedMonthsRows = await orgDb('ricoh_monthly_usage')
      .distinct('month')
      .orderBy('month', 'desc');
    const availableMonths = [...new Set([cycle.billingMonth, ...archivedMonthsRows.map(r => r.month).filter(Boolean)])];

    if (mode === 'meta') {
      return res.json({
        billingCycle: cycle,
        availableMonths
      });
    }

    // Fetch authoritative device & employee identity lookup map so historical computer names map cleanly to current HR/Department
    const devLookupRows = await orgDb('ricoh_device_quotas as rdq')
      .leftJoin('ricoh_departments as rd', 'rdq.department_id', 'rd.id')
      .leftJoin('assets as a', orgDb.raw('a.id = COALESCE(rdq.asset_id, (SELECT a2.id FROM assets a2 WHERE LOWER(TRIM(a2.name)) = LOWER(TRIM(rdq.computer_name)) LIMIT 1))'))
      .leftJoin('users as u', 'a.user_id', 'u.id')
      .leftJoin('hr_employees as hr', function() {
        this.on('a.hr_employee_id', '=', 'hr.id').orOn('u.hr_employee_id', '=', 'hr.id');
      })
      .select(
        'rdq.*',
        orgDb.raw("COALESCE(rd.name, hr.department, u.department, 'General') as resolved_dept"),
        orgDb.raw("COALESCE(hr.name, u.name, a.contact, 'Unassigned') as resolved_user")
      );

    const devByName = {};
    for (const d of devLookupRows) {
      devByName[(d.computer_name || '').toLowerCase().trim()] = d;
    }

    if (mode === 'months') {
      const rawMonths = req.query.months
        ? String(req.query.months).split(',').map(s => s.trim()).filter(Boolean)
        : [];
      const startMonth = req.query.startMonth;
      const endMonth = req.query.endMonth;

      let selectedMonths = rawMonths;
      if (selectedMonths.length === 0 && (startMonth || endMonth)) {
        selectedMonths = availableMonths.filter(m => {
          if (startMonth && m < startMonth) return false;
          if (endMonth && m > endMonth) return false;
          return true;
        });
      }
      if (selectedMonths.length === 0) {
        selectedMonths = [cycle.billingMonth];
      }
      selectedMonths.sort();

      const includeActive = selectedMonths.includes(cycle.billingMonth);
      const archivedTargets = selectedMonths.filter(m => m !== cycle.billingMonth);

      const perDevice = {};
      const monthBreakdownMap = {};
      const deptMonthlyMap = {};
      for (const m of selectedMonths) {
        monthBreakdownMap[m] = { month: m, bw: 0, color: 0, copier_bw: 0, copier_color: 0, total: 0, is_active: m === cycle.billingMonth };
      }

      const upsertUsage = (pcName, userCode, deptFallback, bw, col, cbw, ccol, monthKey) => {
        const key = (pcName || '').toLowerCase().trim();
        if (!key) return;
        const meta = devByName[key];
        const resolvedDeptName = meta?.resolved_dept || deptFallback || 'General';
        if (!perDevice[key]) {
          perDevice[key] = {
            id: meta?.id || pcName,
            computer_name: meta?.computer_name || pcName,
            inventory_user_name: meta?.resolved_user || '-',
            department_name: resolvedDeptName,
            user_code: req.user ? (meta?.user_code || userCode || '-') : null,
            status: meta?.status || 'active',
            monthly_quota_bw: meta ? (meta.monthly_quota_bw ?? 0) : 0,
            monthly_quota_color: meta ? (meta.monthly_quota_color ?? 0) : 0,
            monthly_quota_copier_bw: meta ? (meta.monthly_quota_copier_bw ?? 0) : 0,
            monthly_quota_copier_color: meta ? (meta.monthly_quota_copier_color ?? 0) : 0,
            monthly_quota_copier: meta ? ((meta.monthly_quota_copier_bw ?? 0) + (meta.monthly_quota_copier_color ?? 0)) : 0,
            current_usage_bw: 0,
            current_usage_color: 0,
            current_usage_copier_bw: 0,
            current_usage_copier_color: 0
          };
        }
        const nBw = Number(bw) || 0;
        const nCol = Number(col) || 0;
        const nCbw = Number(cbw) || 0;
        const nCcol = Number(ccol) || 0;
        const nTot = nBw + nCol + nCbw + nCcol;
        perDevice[key].current_usage_bw += nBw;
        perDevice[key].current_usage_color += nCol;
        perDevice[key].current_usage_copier_bw += nCbw;
        perDevice[key].current_usage_copier_color += nCcol;

        if (monthBreakdownMap[monthKey]) {
          monthBreakdownMap[monthKey].bw += nBw;
          monthBreakdownMap[monthKey].color += nCol;
          monthBreakdownMap[monthKey].copier_bw += nCbw;
          monthBreakdownMap[monthKey].copier_color += nCcol;
          monthBreakdownMap[monthKey].total += nTot;
        }

        if (monthKey) {
          if (!deptMonthlyMap[resolvedDeptName]) {
            deptMonthlyMap[resolvedDeptName] = { department: resolvedDeptName, total: 0, months: {} };
          }
          if (!deptMonthlyMap[resolvedDeptName].months[monthKey]) {
            deptMonthlyMap[resolvedDeptName].months[monthKey] = { bw: 0, color: 0, copier_bw: 0, copier_color: 0, total: 0 };
          }
          const dm = deptMonthlyMap[resolvedDeptName].months[monthKey];
          dm.bw += nBw;
          dm.color += nCol;
          dm.copier_bw += nCbw;
          dm.copier_color += nCcol;
          dm.total += nTot;
          deptMonthlyMap[resolvedDeptName].total += nTot;
        }
      };

      if (archivedTargets.length > 0) {
        const archRows = await orgDb('ricoh_monthly_usage as m')
          .leftJoin('ricoh_departments as rd', 'm.department_id', 'rd.id')
          .whereIn('m.month', archivedTargets)
          .select('m.*', 'rd.name as dept_fallback');
        for (const r of archRows) {
          upsertUsage(r.computer_name, r.user_code, r.dept_fallback, r.bw_usage, r.color_usage, r.copier_bw_usage, r.copier_color_usage, r.month);
        }
      }

      if (includeActive) {
        for (const d of devLookupRows) {
          const tot = (Number(d.current_usage_bw) || 0) + (Number(d.current_usage_color) || 0) + (Number(d.current_usage_copier_bw) || 0) + (Number(d.current_usage_copier_color) || 0);
          if (tot > 0) {
            upsertUsage(d.computer_name, d.user_code, d.resolved_dept, d.current_usage_bw, d.current_usage_color, d.current_usage_copier_bw, d.current_usage_copier_color, cycle.billingMonth);
          }
        }
      }

      const deptMonthlyBreakdown = Object.values(deptMonthlyMap).sort((a, b) => b.total - a.total);

      return res.json({
        mode: 'months',
        selectedMonths,
        monthsCount: selectedMonths.length,
        hasSeptemberAnomaly: false,
        monthlyBreakdown: selectedMonths.map(m => monthBreakdownMap[m]),
        deptMonthlyBreakdown,
        devices: Object.values(perDevice),
        billingCycle: cycle
      });
    }

    if (mode === 'custom') {
      const { startDate, endDate } = req.query;
      if (!startDate || !endDate) return res.status(400).json({ error: 'startDate dan endDate wajib diisi' });

      const dailyRows = await orgDb('ricoh_daily_usage as du')
        .leftJoin('ricoh_departments as rd', 'du.department_id', 'rd.id')
        .where('du.date', '>=', startDate)
        .andWhere('du.date', '<=', endDate)
        .groupBy('du.computer_name')
        .select(
          'du.computer_name',
          orgDb.raw('MAX(du.user_code) as user_code'),
          orgDb.raw('MAX(rd.name) as dept_fallback'),
          orgDb.raw('COALESCE(SUM(du.bw_usage),0)::int as bw_usage'),
          orgDb.raw('COALESCE(SUM(du.color_usage),0)::int as color_usage'),
          orgDb.raw('COALESCE(SUM(du.copier_bw_usage),0)::int as copier_bw_usage'),
          orgDb.raw('COALESCE(SUM(du.copier_color_usage),0)::int as copier_color_usage')
        );

      const devices = dailyRows
        .filter(r => (r.bw_usage + r.color_usage + r.copier_bw_usage + r.copier_color_usage) > 0)
        .map(r => {
          const meta = devByName[(r.computer_name || '').toLowerCase().trim()];
          return {
            id: meta?.id || r.computer_name,
            computer_name: meta?.computer_name || r.computer_name,
            inventory_user_name: meta?.resolved_user || '-',
            department_name: meta?.resolved_dept || r.dept_fallback || 'General',
            user_code: req.user ? (meta?.user_code || r.user_code || '-') : null,
            status: meta?.status || 'active',
            monthly_quota_bw: meta ? (meta.monthly_quota_bw ?? 0) : 0,
            monthly_quota_color: meta ? (meta.monthly_quota_color ?? 0) : 0,
            monthly_quota_copier_bw: meta ? (meta.monthly_quota_copier_bw ?? 0) : 0,
            monthly_quota_copier_color: meta ? (meta.monthly_quota_copier_color ?? 0) : 0,
            monthly_quota_copier: meta ? ((meta.monthly_quota_copier_bw ?? 0) + (meta.monthly_quota_copier_color ?? 0)) : 0,
            current_usage_bw: Number(r.bw_usage) || 0,
            current_usage_color: Number(r.color_usage) || 0,
            current_usage_copier_bw: Number(r.copier_bw_usage) || 0,
            current_usage_copier_color: Number(r.copier_color_usage) || 0
          };
        });

      return res.json({
        mode: 'custom',
        startDate,
        endDate,
        dailyCopierCaveat: startDate < '2026-09-24',
        devices,
        billingCycle: cycle
      });
    }

    res.status(400).json({ error: 'Invalid report mode' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// POST /api/ricoh/assign-user - Shortcut to assign an unmapped PC name to a user
router.post('/assign-user', async (req, res) => {
    try {
        const { rawId, assetId, userId } = req.body;
        if (!rawId || !assetId || !userId) {
            return res.status(400).json({ error: 'Missing rawId, assetId, or userId' });
        }

        // Clear any existing mapping for this rawId from other assets (Disabled to allow 1 User -> Many PCs)
        // await db('assets')
        //     .whereRaw('LOWER(TRIM(contact)) = ?', [rawId.trim().toLowerCase()])
        //     .whereNot('id', assetId)
        //     .update({ contact: null, updated_at: new Date() });

        // Map the selected asset
        const asset = await db('assets').where('id', assetId).first();
        if (!asset) {
            return res.status(404).json({ error: 'Asset not found' });
        }

        const trimmedRaw = rawId.trim();
        let newContact = asset.contact && asset.contact !== 'Unassigned'
            ? (asset.contact.toLowerCase().includes(trimmedRaw.toLowerCase()) ? asset.contact : `${asset.contact}, ${trimmedRaw}`)
            : `${trimmedRaw}@${asset.name}`;

        let newWindowsLogin = asset.windows_login
            ? (asset.windows_login.toLowerCase().includes(trimmedRaw.toLowerCase()) ? asset.windows_login : `${asset.windows_login}, ${asset.name}\\${trimmedRaw}`)
            : `${asset.name}\\${trimmedRaw}`;

        const hrExists = await db('hr_employees').where('id', userId).first();
        const assetUpdate = { 
            user_id: userId, 
            contact: newContact,
            windows_login: newWindowsLogin,
            updated_at: new Date() 
        };
        if (hrExists) {
            assetUpdate.hr_employee_id = userId;
        }
        await db('assets').where('id', assetId).update(assetUpdate);

        // Also check if ricoh_device_quotas has a quota record for this rawId or asset
        const existingQuota = await db('ricoh_device_quotas')
            .whereRaw('LOWER(TRIM(computer_name)) = ?', [trimmedRaw.toLowerCase()])
            .first();

        if (existingQuota) {
            await db('ricoh_device_quotas').where('id', existingQuota.id).update({
                asset_id: assetId
            });
        }
        
        return res.json({ message: 'Asset mapped successfully' });
    } catch (err) {
        console.error('[RICOH] Assign User Error:', err);
        res.status(500).json({ error: err.message });
    }
});


// ==========================================
// RICOH QUOTA NOTIFICATIONS & WA ALERTS
// ==========================================
const {
  ensureSupervisorColumns,
  isWaQuotaNotificationsEnabled,
  getWaNotificationConfig,
  getDeviceQuotaStatuses,
  sendQuotaWarning,
  checkAndDispatchAllQuotaWarnings
} = require('../services/ricoh_quota_notifier');

router.get('/supervisors', async (req, res) => {
  try {
    const rows = await db('hr_employees')
      .select('id', 'nik', 'name', 'position', 'department', 'phone', 'status')
      .orderByRaw(`
        CASE
          WHEN LOWER(COALESCE(position, '')) ~ '(plant head|direktur|director)' THEN 1
          WHEN LOWER(COALESCE(position, '')) ~ '(departement head|department head|dept head|manager)' THEN 2
          WHEN LOWER(COALESCE(position, '')) ~ '(section head|spv|supervisor)' THEN 3
          WHEN LOWER(COALESCE(position, '')) ~ '(leader|koordinator)' THEN 4
          ELSE 5
        END ASC, department ASC, name ASC
      `);
    res.json(rows || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/notifications/wa-settings', async (req, res) => {
  try {
    const cfg = await getWaNotificationConfig();
    res.json(cfg);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/notifications/wa-settings', async (req, res) => {
  try {
    const upsertSetting = async (key, val) => {
      const strVal = String(val);
      const existing = await db('settings').where({ section: 'ricoh', key }).first();
      if (existing) {
        await db('settings').where({ id: existing.id }).update({ value: strVal, updated_at: new Date() });
      } else {
        await db('settings').insert({
          section: 'ricoh',
          key,
          value: strVal,
          created_at: new Date(),
          updated_at: new Date()
        });
      }
    };

    if (req.body?.enabled !== undefined) {
      await upsertSetting('wa_quota_notifications_enabled', Boolean(req.body.enabled) ? 'true' : 'false');
    }
    if (req.body?.recipientMode && ['user_only', 'supervisor_only', 'both'].includes(req.body.recipientMode)) {
      await upsertSetting('wa_quota_recipient_mode', req.body.recipientMode);
    }
    if (req.body?.exhaustedOnly !== undefined) {
      await upsertSetting('wa_quota_exhausted_only', Boolean(req.body.exhaustedOnly) ? 'true' : 'false');
    }

    configService.invalidate();
    const updatedCfg = await getWaNotificationConfig();
    res.json({ success: true, ...updatedCfg });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/notifications/quota-warnings', async (req, res) => {
  try {
    const targetOrg = req.query.org || req.headers['x-organization'] || req.organization || (process.env.PLANT_CODE || 'TCF-KG');
    const devices = await getDeviceQuotaStatuses(targetOrg);
    const warnings = devices.filter(d => d.current_threshold >= 99);
    res.json({
      total_devices: devices.length,
      warning_count: warnings.length,
      devices: warnings
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/notifications/quota-warnings/dispatch', async (req, res) => {
  try {
    const targetOrg = req.query.org || req.headers['x-organization'] || req.organization || (process.env.PLANT_CODE || 'TCF-KG');
    const result = await checkAndDispatchAllQuotaWarnings(targetOrg);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/notifications/quota-warnings/send-single/:id', async (req, res) => {
  try {
    const targetOrg = req.query.org || req.headers['x-organization'] || req.organization || (process.env.PLANT_CODE || 'TCF-KG');
    const isTest = req.query.test === 'true' || req.body?.isTest === true || true; // default true for manual single trigger
    const devices = await getDeviceQuotaStatuses(targetOrg);
    const target = devices.find(d => String(d.id) === String(req.params.id));
    if (!target) return res.status(404).json({ error: 'Device not found' });
    
    // Allow sending test notification even if threshold < 99
    if (!target.current_threshold) {
      target.current_threshold = 99;
    }
    const result = await sendQuotaWarning(target, targetOrg, isTest);
    res.json({ success: true, target: target.computer_name, result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// RICOH QUOTA REQUESTS (PENGAJUAN PENAMBAHAN KUOTA)
// ==========================================

// GET /api/ricoh/public-devices - List devices for public search autocomplete
router.get('/public-devices', async (req, res) => {
  try {
    const targetOrg = req.query.org || req.headers['x-organization'] || req.organization || (process.env.PLANT_CODE || 'TCF-KG');
    const orgDb = db.getDb ? db.getDb(targetOrg) : db;
    const devices = await orgDb('ricoh_device_quotas')
      .leftJoin('ricoh_departments', 'ricoh_device_quotas.department_id', 'ricoh_departments.id')
      .leftJoin('assets', 'assets.id', orgDb.raw('COALESCE(ricoh_device_quotas.asset_id, (SELECT a2.id FROM assets a2 WHERE a2.name = ricoh_device_quotas.computer_name LIMIT 1))'))
      .leftJoin('users', 'assets.user_id', 'users.id')
      .leftJoin('hr_employees as hr', function() {
        this.on('assets.hr_employee_id', '=', 'hr.id').orOn('users.hr_employee_id', '=', 'hr.id');
      })
      .select(
        'ricoh_device_quotas.id',
        'ricoh_device_quotas.computer_name',
        orgDb.raw("COALESCE(ricoh_departments.name, hr.department, users.department, 'General') as department_name"),
        orgDb.raw("COALESCE(hr.name, users.name, assets.contact, 'User') as user_name")
      )
      .orderBy('ricoh_device_quotas.computer_name', 'asc');
    res.json(devices);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ricoh/request-verify - Verify Device, PIN Ricoh, and NIK/Password
router.post('/request-verify', async (req, res) => {
  try {
    const { computer_name, pin, password, organization } = req.body;
    const targetOrg = organization || req.headers['x-organization'] || req.organization || (process.env.PLANT_CODE || 'TCF-KG');
    const orgDb = db.getDb ? db.getDb(targetOrg) : db;

    if (!computer_name || !pin) {
      return res.status(400).json({ error: 'Nama Komputer dan PIN Ricoh wajib diisi.' });
    }

    const cleanComp = computer_name.trim();
    const cleanPin = pin.trim();
    const cleanPass = (password || '').toString().trim().replace(/[\.,\s\-]/g, '');

    const device = await orgDb('ricoh_device_quotas')
      .leftJoin('assets', 'assets.id', orgDb.raw('COALESCE(ricoh_device_quotas.asset_id, (SELECT a2.id FROM assets a2 WHERE a2.name = ricoh_device_quotas.computer_name LIMIT 1))'))
      .leftJoin('users', 'assets.user_id', 'users.id')
      .leftJoin('hr_employees as hr', function() {
        this.on('assets.hr_employee_id', '=', 'hr.id').orOn('users.hr_employee_id', '=', 'hr.id');
      })
      .leftJoin('ricoh_departments', 'ricoh_device_quotas.department_id', 'ricoh_departments.id')
      .whereRaw('LOWER(TRIM(ricoh_device_quotas.computer_name)) = ?', [cleanComp.toLowerCase()])
      .select(
        'ricoh_device_quotas.*',
        'assets.id as asset_id',
        'assets.contact as asset_contact',
        'users.id as user_id',
        'users.password as user_password',
        'hr.id as hr_id',
        'hr.nik as hr_nik',
        orgDb.raw("COALESCE(hr.phone, users.whatsapp, '') as resolved_phone"),
        orgDb.raw("COALESCE(hr.name, users.name, assets.contact, 'User') as resolved_user_name"),
        orgDb.raw("COALESCE(ricoh_departments.name, hr.department, users.department, 'General') as department_name")
      )
      .first();

    if (!device) {
      return res.status(404).json({ error: `Perangkat '${cleanComp}' tidak ditemukan dalam sistem Manajemen Kuota Ricoh.` });
    }

    // Verify PIN Ricoh (User Code)
    const dbPin = (device.user_code || '').trim();
    if (!dbPin || dbPin !== cleanPin) {
      return res.status(401).json({ error: 'PIN Ricoh (User Code) salah atau tidak sesuai untuk perangkat ini.' });
    }

    // If password provided, verify against NIK or User password
    if (cleanPass) {
      const dbNikClean = (device.hr_nik || '').replace(/[\.,\s\-]/g, '').trim();
      const dbUserPass = (device.user_password || '').trim();
      const isNikMatch = dbNikClean && (cleanPass === dbNikClean);
      const isPassMatch = dbUserPass && (cleanPass === dbUserPass.replace(/[\.,\s\-]/g, ''));

      if (!isNikMatch && !isPassMatch) {
        return res.status(401).json({ error: 'NIK / Password tidak cocok dengan pemegang perangkat ini.' });
      }
    }

    const quotaBw = Number(device.monthly_quota_bw) || 0;
    const usageBw = Number(device.current_usage_bw) || 0;
    const quotaColor = Number(device.monthly_quota_color) || 0;
    const usageColor = Number(device.current_usage_color) || 0;

    const fbCopier = Number(device.monthly_quota_copier) || 0;
    const quotaCopierBw = device.monthly_quota_copier_bw != null ? Number(device.monthly_quota_copier_bw) : Math.round(fbCopier * 0.8);
    const quotaCopierColor = device.monthly_quota_copier_color != null ? Number(device.monthly_quota_copier_color) : Math.max(0, fbCopier - quotaCopierBw);
    const usageCopierBw = Number(device.current_usage_copier_bw) || 0;
    const usageCopierColor = Number(device.current_usage_copier_color) || 0;
    const quotaCopier = quotaCopierBw + quotaCopierColor;
    const usageCopier = usageCopierBw + usageCopierColor;

    res.json({
      verified: true,
      device_id: device.id,
      computer_name: device.computer_name,
      department_name: device.department_name,
      user_name: device.resolved_user_name,
      user_phone: device.resolved_phone,
      user_nik: device.hr_nik || '',
      quota_bw: quotaBw,
      usage_bw: usageBw,
      remaining_bw: Math.max(0, quotaBw - usageBw),
      quota_color: quotaColor,
      usage_color: usageColor,
      remaining_color: Math.max(0, quotaColor - usageColor),
      quota_copier_bw: quotaCopierBw,
      usage_copier_bw: usageCopierBw,
      remaining_copier_bw: Math.max(0, quotaCopierBw - usageCopierBw),
      quota_copier_color: quotaCopierColor,
      usage_copier_color: usageCopierColor,
      remaining_copier_color: Math.max(0, quotaCopierColor - usageCopierColor),
      quota_copier: quotaCopier,
      usage_copier: usageCopier,
      remaining_copier: Math.max(0, quotaCopier - usageCopier)
    });
  } catch (err) {
    console.error('[RICOH] Verify error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ricoh/request-submit - Submit Quota Request
router.post('/request-submit', async (req, res) => {
  try {
    const {
      device_id,
      computer_name,
      pin,
      applicant_name,
      applicant_nik,
      applicant_phone,
      request_type,
      amount_bw,
      amount_color,
      amount_copier,
      amount_copier_bw,
      amount_copier_color,
      reason,
      organization
    } = req.body;

    const targetOrg = organization || req.headers['x-organization'] || req.organization || (process.env.PLANT_CODE || 'TCF-KG');
    const orgDb = db.getDb ? db.getDb(targetOrg) : db;

    if (!computer_name || !pin || !applicant_name || !reason) {
      return res.status(400).json({ error: 'Semua kolom wajib (Perangkat, PIN, Nama, Alasan) harus diisi.' });
    }

    // Verify PIN one more time
    const device = await orgDb('ricoh_device_quotas')
      .whereRaw('LOWER(TRIM(computer_name)) = ?', [computer_name.trim().toLowerCase()])
      .first();

    if (!device || (device.user_code || '').trim() !== pin.trim()) {
      return res.status(401).json({ error: 'PIN Ricoh tidak valid.' });
    }

    const numBw = Math.max(0, parseInt(amount_bw) || 0);
    const numColor = Math.max(0, parseInt(amount_color) || 0);
    const numCopierBw = amount_copier_bw !== undefined ? Math.max(0, parseInt(amount_copier_bw) || 0) : Math.max(0, parseInt(amount_copier) || 0);
    const numCopierColor = Math.max(0, parseInt(amount_copier_color) || 0);
    const numCopierTotal = numCopierBw + numCopierColor;

    if (numBw === 0 && numColor === 0 && numCopierTotal === 0) {
      return res.status(400).json({ error: 'Jumlah penambahan kuota minimal harus lebih dari 0 lembar.' });
    }

    // Get department
    const dept = await orgDb('ricoh_departments').where('id', device.department_id).first();
    const deptName = dept?.name || 'General';

    const [inserted] = await orgDb('ricoh_quota_requests').insert({
      device_id: device.id,
      computer_name: device.computer_name,
      department_name: deptName,
      user_code: pin.trim(),
      applicant_name: applicant_name.trim(),
      applicant_nik: (applicant_nik || '').trim(),
      applicant_phone: (applicant_phone || '').trim(),
      request_type: request_type || 'BW',
      amount_bw: numBw,
      amount_color: numColor,
      amount_copier: numCopierTotal,
      amount_copier_bw: numCopierBw,
      amount_copier_color: numCopierColor,
      reason: reason.trim(),
      status: 'PENDING',
      created_at: new Date(),
      updated_at: new Date()
    }).returning('*');

    const requestId = typeof inserted === 'object' ? inserted.id : inserted;

    // Dispatch WhatsApp Alert to ICT Helpdesk
    const waPorts = [5002, 5003, 5004];
    const axios = require('axios');
    const helpdeskMsg = 
      `📩 *[PENGAJUAN PENAMBAHAN KUOTA RICOH BARU]*\n\n` +
      `👤 *Pemohon*: *${applicant_name.trim()}*\n` +
      `🏢 *Departemen*: ${deptName}\n` +
      `🖥️ *Perangkat*: \`${device.computer_name}\` (PIN: \`${pin.trim()}\`)\n` +
      `📱 *No. WhatsApp*: ${applicant_phone || '-'}\n\n` +
      `📊 *Rincian Tambahan Kuota yang Diajukan:*\n` +
      (numBw > 0 ? `• 📄 Print B/W: *+${numBw} lembar*\n` : '') +
      (numColor > 0 ? `• 🎨 Print Color: *+${numColor} lembar*\n` : '') +
      (numCopierBw > 0 ? `• 📋 Copy B/W: *+${numCopierBw} lembar*\n` : '') +
      (numCopierColor > 0 ? `• 🌈 Copy Color: *+${numCopierColor} lembar*\n` : '') +
      `\n📝 *Alasan / Keperluan:*\n"${reason.trim()}"\n\n` +
      `⏳ *Status*: *Menunggu Persetujuan Tim ICT*\n` +
      `Silakan review dan setujui di Menu Manajemen Kuota Ricoh.`;

    for (const port of waPorts) {
      try {
        await axios.post(`http://127.0.0.1:${port}/send-message`, {
          to: 'GROUP:Tehnisi Helpdesk TCFSG',
          message: helpdeskMsg,
          shouldLog: false
        }, { timeout: 4000 });
        break;
      } catch (e) {}
    }

    // Also send WA confirmation to applicant if phone number provided
    if (applicant_phone) {
      let cleanPhone = String(applicant_phone).replace(/[^0-9]/g, '');
      if (cleanPhone.startsWith('08')) cleanPhone = '62' + cleanPhone.slice(1);
      else if (cleanPhone.startsWith('8')) cleanPhone = '62' + cleanPhone;

      if (cleanPhone.length >= 10) {
        const userMsg = 
          `Halo *${applicant_name.trim()}*,\n\n` +
          `Pengajuan penambahan kuota Ricoh Anda untuk perangkat *${device.computer_name}* telah diterima oleh sistem dan sedang menunggu persetujuan Tim ICT.\n\n` +
          `Rincian Pengajuan:\n` +
          (numBw > 0 ? `• Print B/W: +${numBw} lembar\n` : '') +
          (numColor > 0 ? `• Print Color: +${numColor} lembar\n` : '') +
          (numCopierBw > 0 ? `• Copy B/W: +${numCopierBw} lembar\n` : '') +
          (numCopierColor > 0 ? `• Copy Color: +${numCopierColor} lembar\n` : '') +
          `\nAnda akan menerima notifikasi WhatsApp otomatis saat pengajuan telah disetujui. Terima kasih!`;

        for (const port of waPorts) {
          try {
            await axios.post(`http://127.0.0.1:${port}/send-message`, {
              to: cleanPhone,
              message: userMsg,
              shouldLog: false
            }, { timeout: 4000 });
            break;
          } catch (e) {}
        }
      }
    }

    res.json({
      success: true,
      message: 'Pengajuan penambahan kuota berhasil dikirim dan sedang menunggu persetujuan Tim ICT.',
      request_id: requestId
    });
  } catch (err) {
    console.error('[RICOH] Submit error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/ricoh/my-requests - Get quota requests for the current user/device
router.get('/my-requests', async (req, res) => {
  try {
    const targetOrg = req.query.org || req.headers['x-organization'] || req.organization || (process.env.PLANT_CODE || 'TCF-KG');
    const orgDb = db.getDb ? db.getDb(targetOrg) : db;
    const { device_name, applicant_nik, applicant_name } = req.query;

    let query = orgDb('ricoh_quota_requests').orderBy('id', 'desc').limit(20);

    if (device_name || applicant_nik || applicant_name || (req.user && req.user.name)) {
      query = query.where(function() {
        if (device_name) {
          this.orWhere('computer_name', 'ilike', `%${device_name.trim()}%`);
        }
        if (applicant_nik) {
          const cleanNik = applicant_nik.trim().replace(/[\.,\s\-]/g, '');
          this.orWhere('applicant_nik', 'ilike', `%${cleanNik}%`);
        }
        if (applicant_name) {
          this.orWhere('applicant_name', 'ilike', `%${applicant_name.trim()}%`);
        }
        if (req.user && req.user.name) {
          this.orWhere('applicant_name', 'ilike', `%${req.user.name.trim()}%`);
        }
      });
    }

    const requests = await query;
    res.json(requests);
  } catch (err) {
    console.error('Error fetching my quota requests:', err);
    res.status(500).json({ error: 'Gagal memuat riwayat pengajuan kuota.' });
  }
});

// GET /api/ricoh/quota-requests - List Quota Requests for ICT Management
router.get('/quota-requests', async (req, res) => {
  try {
    const targetOrg = req.query.org || req.headers['x-organization'] || req.organization || (process.env.PLANT_CODE || 'TCF-KG');
    const orgDb = db.getDb ? db.getDb(targetOrg) : db;
    const { status } = req.query;

    let query = orgDb('ricoh_quota_requests').orderBy('id', 'desc');
    if (status && status !== 'ALL') {
      query = query.where('status', status.toUpperCase());
    }

    const requests = await query;
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ricoh/quota-requests/:id/approve - Approve Request
router.post('/quota-requests/:id/approve', async (req, res) => {
  try {
    const targetOrg = req.body.organization || req.headers['x-organization'] || req.organization || (process.env.PLANT_CODE || 'TCF-KG');
    const orgDb = db.getDb ? db.getDb(targetOrg) : db;
    const requestId = req.params.id;
    const { admin_notes, approved_by } = req.body;

    const request = await orgDb('ricoh_quota_requests').where('id', requestId).first();
    if (!request) return res.status(404).json({ error: 'Pengajuan tidak ditemukan.' });
    if (request.status !== 'PENDING') {
      return res.status(400).json({ error: `Pengajuan ini sudah berstatus ${request.status}.` });
    }

    const adminName = approved_by || req.user?.name || 'ICT Admin';

    // 1. Update ricoh_device_quotas
    const device = await orgDb('ricoh_device_quotas').where('id', request.device_id).first();
    const addCpyBw = request.amount_copier_bw != null ? Number(request.amount_copier_bw) : (Number(request.amount_copier) || 0);
    const addCpyColor = Number(request.amount_copier_color) || 0;
    if (device) {
      const curCpyBw = device.monthly_quota_copier_bw != null ? Number(device.monthly_quota_copier_bw) : Math.round((Number(device.monthly_quota_copier) || 200) * 0.8);
      const curCpyCol = device.monthly_quota_copier_color != null ? Number(device.monthly_quota_copier_color) : Math.max(0, (Number(device.monthly_quota_copier) || 200) - curCpyBw);
      const nextCpyBw = curCpyBw + addCpyBw;
      const nextCpyCol = curCpyCol + addCpyColor;
      await orgDb('ricoh_device_quotas').where('id', device.id).update({
        monthly_quota_bw: (Number(device.monthly_quota_bw) || 0) + (Number(request.amount_bw) || 0),
        monthly_quota_color: (Number(device.monthly_quota_color) || 0) + (Number(request.amount_color) || 0),
        monthly_quota_copier_bw: nextCpyBw,
        monthly_quota_copier_color: nextCpyCol,
        monthly_quota_copier: nextCpyBw + nextCpyCol,
        status: 'active'
      });

      try {
        const { checkAndEnforceCopierQuotas } = require('../services/ricoh_copier_lock');
        checkAndEnforceCopierQuotas(targetOrg).catch(() => {});
      } catch (e) {}
    }

    // 2. Update request status
    await orgDb('ricoh_quota_requests').where('id', requestId).update({
      status: 'APPROVED',
      approved_by: adminName,
      approved_at: new Date(),
      admin_notes: admin_notes || null,
      updated_at: new Date()
    });

    // 3. Dispatch WhatsApp Notification to Applicant
    if (request.applicant_phone) {
      let cleanPhone = String(request.applicant_phone).replace(/[^0-9]/g, '');
      if (cleanPhone.startsWith('08')) cleanPhone = '62' + cleanPhone.slice(1);
      else if (cleanPhone.startsWith('8')) cleanPhone = '62' + cleanPhone;

      if (cleanPhone.length >= 10) {
        const axios = require('axios');
        const userMsg = 
          `✅ *[PENGAJUAN KUOTA RICOH DISETUJUI]*\n\n` +
          `Halo *${request.applicant_name}*,\n` +
          `Pengajuan penambahan kuota Anda untuk perangkat *${request.computer_name}* telah *DISETUJUI* oleh Admin ICT (${adminName}).\n\n` +
          `📊 *Tambahan Kuota Otomatis Aktif:*\n` +
          (request.amount_bw > 0 ? `• 📄 Print B/W: *+${request.amount_bw} lembar*\n` : '') +
          (request.amount_color > 0 ? `• 🎨 Print Color: *+${request.amount_color} lembar*\n` : '') +
          (addCpyBw > 0 ? `• 📋 Copy B/W: *+${addCpyBw} lembar*\n` : '') +
          (addCpyColor > 0 ? `• 🌈 Copy Color: *+${addCpyColor} lembar*\n` : '') +
          `\nStatus perangkat dan fotokopi Anda telah aktif normal kembali. Silakan melanjutkan cetak di mesin Ricoh. Terima kasih!\n\n` +
          `_Pusat Layanan Support Center & Asset ICT PT. Tri Centrum Fortuna_`;

        const waPorts = [5002, 5003, 5004];
        for (const port of waPorts) {
          try {
            await axios.post(`http://127.0.0.1:${port}/send-message`, {
              to: cleanPhone,
              message: userMsg,
              shouldLog: false
            }, { timeout: 4000 });
            break;
          } catch (e) {}
        }
      }
    }

    res.json({ success: true, message: 'Pengajuan berhasil disetujui dan kuota telah ditambahkan.' });
  } catch (err) {
    console.error('[RICOH] Approve error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ricoh/quota-requests/:id/reject - Reject Request
router.post('/quota-requests/:id/reject', async (req, res) => {
  try {
    const targetOrg = req.body.organization || req.headers['x-organization'] || req.organization || (process.env.PLANT_CODE || 'TCF-KG');
    const orgDb = db.getDb ? db.getDb(targetOrg) : db;
    const requestId = req.params.id;
    const { admin_notes, approved_by } = req.body;

    const request = await orgDb('ricoh_quota_requests').where('id', requestId).first();
    if (!request) return res.status(404).json({ error: 'Pengajuan tidak ditemukan.' });

    const adminName = approved_by || req.user?.name || 'ICT Admin';

    await orgDb('ricoh_quota_requests').where('id', requestId).update({
      status: 'REJECTED',
      approved_by: adminName,
      approved_at: new Date(),
      admin_notes: admin_notes || 'Ditolak oleh admin',
      updated_at: new Date()
    });

    if (request.applicant_phone) {
      let cleanPhone = String(request.applicant_phone).replace(/[^0-9]/g, '');
      if (cleanPhone.startsWith('08')) cleanPhone = '62' + cleanPhone.slice(1);
      else if (cleanPhone.startsWith('8')) cleanPhone = '62' + cleanPhone;

      if (cleanPhone.length >= 10) {
        const axios = require('axios');
        const userMsg = 
          `❌ *[PENGAJUAN KUOTA RICOH TIDAK DISETUJUI]*\n\n` +
          `Halo *${request.applicant_name}*,\n` +
          `Mohon maaf, pengajuan penambahan kuota Anda untuk perangkat *${request.computer_name}* belum dapat disetujui oleh Admin ICT.\n\n` +
          `Catatan Admin: "${admin_notes || 'Tidak memenuhi kriteria penambahan'}"\n\n` +
          `Silakan menghubungi Tim ICT jika ada kebutuhan operasional mendesak. Terima kasih.`;

        const waPorts = [5002, 5003, 5004];
        for (const port of waPorts) {
          try {
            await axios.post(`http://127.0.0.1:${port}/send-message`, {
              to: cleanPhone,
              message: userMsg,
              shouldLog: false
            }, { timeout: 4000 });
            break;
          } catch (e) {}
        }
      }
    }

    res.json({ success: true, message: 'Pengajuan telah ditolak.' });
  } catch (err) {
    console.error('[RICOH] Reject error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;