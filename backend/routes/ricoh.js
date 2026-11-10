const express = require('express');


const router = express.Router();


const db = require('../db');


const path = require('path');


const fs = require('fs');


const { pollDevice } = require('../services/ricoh_snmp');


const xlsx = require('xlsx');
const { getCurrentBillingCycle, getPreviousBillingCycle, performBillingCycleReset } = require('../services/ricoh_billing_cycle');
const { generateUniquePin } = require('../services/asset_sync');
// Auto Excel generation function for Ricoh Address Book


const generateExcelFile = async (org = 'TCF-SG') => {
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
      'Copy Quota': row.monthly_quota_copier || 0,
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
      if (/^[A-Za-z0-9]+-[A-Za-z0-9]+-[0-9A-Fa-f]{4}$/i.test(a.name.trim())) return false;
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

        if (!existingQuota) {
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
            copier_status: 'active',
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
      .groupBy('department_id');

    for (const agg of aggregated) {
      if (agg.department_id) {
        await db('ricoh_departments')
          .where('id', agg.department_id)
          .update({
            monthly_quota_bw: Number(agg.total_bw) || 0,
            monthly_quota_color: Number(agg.total_color) || 0,
            monthly_quota_copier: Number(agg.total_copier) || 0
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
      const uCopier = deptDevices.reduce((sum, d) => sum + (Number(d.current_usage_copier_bw) || 0) + (Number(d.current_usage_copier_color) || 0), 0);
      
      // Auto-accumulate quotas from member devices (User / PC Quotas)
      const sumQuotaBw = deptDevices.reduce((sum, d) => sum + (Number(d.monthly_quota_bw) || 0), 0);
      const sumQuotaColor = deptDevices.reduce((sum, d) => sum + (Number(d.monthly_quota_color) || 0), 0);
      const sumQuotaCopier = deptDevices.reduce((sum, d) => sum + (Number(d.monthly_quota_copier) || 0), 0);

      // If department has devices assigned, the department quota is automatically the accumulated total of member PC quotas!
      const qBw = deptDevices.length > 0 ? sumQuotaBw : (Number(dept.monthly_quota_bw) || 0);
      const qColor = deptDevices.length > 0 ? sumQuotaColor : (Number(dept.monthly_quota_color) || 0);
      const qCopier = deptDevices.length > 0 ? sumQuotaCopier : (Number(dept.monthly_quota_copier) || 0);

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
        manual_quota_bw: Number(dept.monthly_quota_bw) || 0,
        manual_quota_color: Number(dept.monthly_quota_color) || 0,
        manual_quota_copier: Number(dept.monthly_quota_copier) || 0,
        current_usage_bw: uBw,
        current_usage_color: uColor,
        current_usage_copier: uCopier,
        device_count: deptDevices.length,
        user_count: distinctUsers.size,
        members: deptDevices.map(d => ({
          id: d.id,
          computer_name: d.computer_name,
          ip_address: d.ip_address,
          user_code: d.user_code,
          user_name: d.user_name || d.asset_contact || 'Unassigned',
          whatsapp: d.user_whatsapp || null,
          status: d.status,
          copier_status: d.copier_status,
          current_usage_bw: Number(d.current_usage_bw) || 0,
          current_usage_color: Number(d.current_usage_color) || 0,
          current_usage_copier: (Number(d.current_usage_copier_bw) || 0) + (Number(d.current_usage_copier_color) || 0),
          monthly_quota_bw: Number(d.monthly_quota_bw) || 1000,
          monthly_quota_color: Number(d.monthly_quota_color) || 500,
          monthly_quota_copier: Number(d.monthly_quota_copier) || 200
        }))
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});





router.post('/departments', async (req, res) => {
  try {
    const { name, monthly_quota_bw, monthly_quota_color, monthly_quota_copier } = req.body;
    const [id] = await db('ricoh_departments').insert({
      name, 
      monthly_quota_bw: monthly_quota_bw || 10000, 
      monthly_quota_color: monthly_quota_color || 5000,
      monthly_quota_copier: monthly_quota_copier || 2000
    }).returning('id');


    res.json({ id: id?.id || id, message: 'Department added successfully' });


  } catch (err) {


    res.status(500).json({ error: err.message });


  }


});





router.put('/departments/:id/quota', async (req, res) => {
  try {
    const { monthly_quota_bw, monthly_quota_color, monthly_quota_copier, name } = req.body;
    const updateData = {
      monthly_quota_bw, 
      monthly_quota_color, 
      name
    };
    if (monthly_quota_copier !== undefined) {
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
    await syncInventoryToDeviceQuotas();

    const rows = await db('ricoh_device_quotas')
      .leftJoin('assets', 'assets.id', db.raw('COALESCE(ricoh_device_quotas.asset_id, (SELECT a2.id FROM assets a2 WHERE a2.name = ricoh_device_quotas.computer_name LIMIT 1))'))
      .leftJoin('users', 'assets.user_id', 'users.id')
      .leftJoin('hr_employees as hr', 'assets.hr_employee_id', 'hr.id')
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
        db.raw("COALESCE(ricoh_departments.name, hr.department, users.department, assets.location, 'General') as department_name")
      )
      .orderBy('ricoh_device_quotas.computer_name', 'asc');

    const enriched = rows.map(r => {
      const qBw = Number(r.monthly_quota_bw) || 1000;
      const uBw = Number(r.current_usage_bw) || 0;
      const qColor = Number(r.monthly_quota_color) || 500;
      const uColor = Number(r.current_usage_color) || 0;
      const qCopier = Number(r.monthly_quota_copier) || 200;
      const uCopier = (Number(r.current_usage_copier_bw) || 0) + (Number(r.current_usage_copier_color) || 0);

      const bw_pct = Math.round((uBw / qBw) * 100);
      const color_pct = Math.round((uColor / qColor) * 100);
      const copier_pct = Math.round((uCopier / qCopier) * 100);
      const max_pct = Math.max(bw_pct, color_pct, copier_pct);

      return {
        ...r,
        bw_pct,
        color_pct,
        copier_pct,
        max_pct,
        is_warning_80: max_pct >= 80,
        is_warning_90: max_pct >= 90,
        is_critical_99: max_pct >= 99
      };
    });

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});





router.post('/devices/quotas', async (req, res) => {


  try {


    const { computer_name, ip_address, monthly_quota_bw, monthly_quota_color, monthly_quota_copier, user_code, department_id } = req.body;
    const pin = user_code || Math.floor(1000 + Math.random() * 9000).toString();

    const [id] = await db('ricoh_device_quotas').insert({
      computer_name, ip_address: ip_address || '', 
      monthly_quota_bw: monthly_quota_bw || 1000, 
      monthly_quota_color: monthly_quota_color || 500,
      monthly_quota_copier: monthly_quota_copier || 200,
      copier_status: 'active',
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
    const { monthly_quota_bw, monthly_quota_color, monthly_quota_copier, user_code, department_id } = req.body;

    const targetDevice = await db('ricoh_device_quotas').where('id', req.params.id).first();
    if (!targetDevice) return res.status(404).json({ error: "Device not found" });

    // Check if the new user_code is different and already belongs to another device
    if (user_code && user_code !== targetDevice.user_code) {
        const otherDevice = await db('ricoh_device_quotas').where('user_code', user_code).first();
        if (otherDevice) {
            // SWAP their usage data and their PINs
            await db('ricoh_device_quotas').where('id', targetDevice.id).update({
                user_code: otherDevice.user_code,
                current_usage_bw: otherDevice.current_usage_bw,
                current_usage_color: otherDevice.current_usage_color,
                current_usage_copier_bw: otherDevice.current_usage_copier_bw,
                current_usage_copier_color: otherDevice.current_usage_copier_color,
                lifetime_bw: otherDevice.lifetime_bw,
                lifetime_color: otherDevice.lifetime_color,
                lifetime_copier_bw: otherDevice.lifetime_copier_bw,
                lifetime_copier_color: otherDevice.lifetime_copier_color,
                monthly_quota_bw: monthly_quota_bw,
                monthly_quota_color: monthly_quota_color,
                monthly_quota_copier: monthly_quota_copier !== undefined ? monthly_quota_copier : targetDevice.monthly_quota_copier,
                department_id: department_id || null
            });

            await db('ricoh_device_quotas').where('id', otherDevice.id).update({
                user_code: targetDevice.user_code,
                current_usage_bw: targetDevice.current_usage_bw,
                current_usage_color: targetDevice.current_usage_color,
                current_usage_copier_bw: targetDevice.current_usage_copier_bw,
                current_usage_copier_color: targetDevice.current_usage_copier_color,
                lifetime_bw: targetDevice.lifetime_bw,
                lifetime_color: targetDevice.lifetime_color,
                lifetime_copier_bw: targetDevice.lifetime_copier_bw,
                lifetime_copier_color: targetDevice.lifetime_copier_color
            });

            await generateExcelFile();
            return res.json({ updated: 2, swapped: true });
        }
    }

    const updatePayload = {
      monthly_quota_bw,
      monthly_quota_color,
      user_code,
      department_id: department_id || null
    };
    if (monthly_quota_copier !== undefined) {
      updatePayload.monthly_quota_copier = monthly_quota_copier;
    }

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
    const { status } = req.body; // 'active' or 'locked'
    const targetDevice = await db('ricoh_device_quotas').where('id', req.params.id).first();
    if (!targetDevice) return res.status(404).json({ error: "Device not found" });

    await db('ricoh_device_quotas').where('id', req.params.id).update({ copier_status: status });

    // Push hardware update if user has PIN
    if (targetDevice.user_code) {
      try {
        const { syncCopierPermissionToPrinters } = require('../services/ricoh_copier_lock');
        syncCopierPermissionToPrinters(targetDevice.user_code, status === 'active').catch(e => {
          console.error('[COPIER STATUS ERROR] Failed to push to hardware:', e.message);
        });
      } catch(e) {}
    }

    res.json({ message: `Copier status updated to ${status}`, copier_status: status });
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
    const targetOrg = req.query.org || req.headers['x-organization'] || req.organization || 'TCF-SG';
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
      'Copy Quota': row.monthly_quota_copier || 0,
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
        monthly_quota_bw: profile.monthly_quota_bw || 1000,
        current_usage_bw: profile.current_usage_bw || 0,
        monthly_quota_color: profile.monthly_quota_color || 500,
        current_usage_color: profile.current_usage_color || 0,
        monthly_quota_copier: profile.monthly_quota_copier || 200,
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

    const targetOrg = req.query.org || req.headers['x-organization'] || req.organization || 'TCF-SG';
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
    const cycle = getCurrentBillingCycle();
    
    const currentRows = await db('ricoh_daily_usage')
      .leftJoin('ricoh_departments', 'ricoh_daily_usage.department_id', 'ricoh_departments.id')
      .leftJoin('assets', 'ricoh_daily_usage.computer_name', 'assets.name')
      .leftJoin('users', 'assets.user_id', 'users.id')
      .select(
        'ricoh_daily_usage.computer_name', 
        'ricoh_daily_usage.user_code', 
        'ricoh_departments.name as department_name',
        'users.name as inventory_user_name',
        'assets.contact as inventory_contact'
      )
      .sum('ricoh_daily_usage.bw_usage as bw_usage')
      .sum('ricoh_daily_usage.color_usage as color_usage')
      .sum('ricoh_daily_usage.copier_bw_usage as copier_bw_usage')
      .sum('ricoh_daily_usage.copier_color_usage as copier_color_usage')
      .where('ricoh_daily_usage.date', '>=', cycle.startDate)
      .andWhere('ricoh_daily_usage.date', '<=', cycle.endDate)
      .groupBy(
        'ricoh_daily_usage.computer_name',
        'ricoh_daily_usage.user_code',
        'ricoh_departments.name',
        'users.name',
        'assets.contact'
      );
      
    const formattedCurrentRows = currentRows
      .filter(r => (Number(r.bw_usage) + Number(r.color_usage) + Number(r.copier_bw_usage) + Number(r.copier_color_usage)) > 0)
      .map(r => ({
        ...r,
        id: 'curr_' + r.computer_name,
        month: cycle.billingMonth + ` (${cycle.label} - Aktif)`
      }));
    
    const historicalRows = await db('ricoh_monthly_usage')
      .leftJoin('ricoh_departments', 'ricoh_monthly_usage.department_id', 'ricoh_departments.id')
      .leftJoin('ricoh_device_quotas', 'ricoh_monthly_usage.computer_name', 'ricoh_device_quotas.computer_name')
      .leftJoin('assets', function() {
        this.on('ricoh_device_quotas.asset_id', '=', 'assets.id')
            .orOn('ricoh_monthly_usage.computer_name', '=', 'assets.name');
      })
      .leftJoin('users', 'assets.user_id', 'users.id')
      .select(
        'ricoh_monthly_usage.*', 
        'ricoh_departments.name as department_name',
        'users.name as inventory_user_name',
        'assets.contact as inventory_contact'
      )
      .orderBy('ricoh_monthly_usage.month', 'desc')
      .orderBy('ricoh_monthly_usage.bw_usage', 'desc');
      
    res.json([...formattedCurrentRows, ...historicalRows]);
  } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/custom-range-logs', async (req, res) => {
  try {
    const { start, end } = req.query;
    if (!start || !end) return res.status(400).json({ error: 'Missing start or end date' });

    const rows = await db('ricoh_daily_usage')
      .leftJoin('ricoh_departments', 'ricoh_daily_usage.department_id', 'ricoh_departments.id')
      .leftJoin('assets', 'ricoh_daily_usage.computer_name', 'assets.name')
      .leftJoin('users', 'assets.user_id', 'users.id')
      .select(
        'ricoh_daily_usage.computer_name', 
        'ricoh_daily_usage.user_code', 
        'ricoh_departments.name as department_name',
        'users.name as inventory_user_name',
        'assets.contact as inventory_contact'
      )
      .sum('ricoh_daily_usage.bw_usage as bw_usage')
      .sum('ricoh_daily_usage.color_usage as color_usage')
      .sum('ricoh_daily_usage.copier_bw_usage as copier_bw_usage')
      .sum('ricoh_daily_usage.copier_color_usage as copier_color_usage')
      .where('ricoh_daily_usage.date', '>=', start)
      .where('ricoh_daily_usage.date', '<=', end)
      .groupBy(
        'ricoh_daily_usage.computer_name',
        'ricoh_daily_usage.user_code',
        'ricoh_departments.name',
        'users.name',
        'assets.contact'
      );
      
    // Format them to match the expected frontend structure
    const formattedRows = rows.map(r => ({
      ...r,
      month: `${start} to ${end}`,
      id: `custom_${r.computer_name}`
    })).filter(r => (Number(r.bw_usage) + Number(r.color_usage) + Number(r.copier_bw_usage) + Number(r.copier_color_usage)) > 0);
    
    res.json(formattedRows);
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
  getDeviceQuotaStatuses, 
  sendQuotaWarning, 
  checkAndDispatchAllQuotaWarnings 
} = require('../services/ricoh_quota_notifier');

router.get('/notifications/quota-warnings', async (req, res) => {
  try {
    const targetOrg = req.query.org || req.headers['x-organization'] || req.organization || 'TCF-SG';
    const devices = await getDeviceQuotaStatuses(targetOrg);
    const warnings = devices.filter(d => d.current_threshold >= 80);
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
    const targetOrg = req.query.org || req.headers['x-organization'] || req.organization || 'TCF-SG';
    const result = await checkAndDispatchAllQuotaWarnings(targetOrg);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/notifications/quota-warnings/send-single/:id', async (req, res) => {
  try {
    const targetOrg = req.query.org || req.headers['x-organization'] || req.organization || 'TCF-SG';
    const devices = await getDeviceQuotaStatuses(targetOrg);
    const target = devices.find(d => String(d.id) === String(req.params.id));
    if (!target) return res.status(404).json({ error: 'Device not found' });
    
    // Allow sending test notification even if threshold < 80
    if (!target.current_threshold) {
      target.current_threshold = 80;
    }
    const result = await sendQuotaWarning(target, targetOrg);
    res.json({ success: true, target: target.computer_name, result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;