const express = require('express');
const { query, getClient } = require('../db');
const { verifyToken } = require('../middleware/auth');
const { checkAndAlertLowStock } = require('../services/whatsapp');

const router = express.Router();

// GET / — list employees
router.get('/', verifyToken, async (req, res) => {
  try {
    const { search, status, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let conditions = [], params = [], idx = 1;
    if (search) { conditions.push(`(e.name ILIKE $${idx} OR e.contact_number ILIKE $${idx} OR e.designation ILIKE $${idx})`); params.push(`%${search}%`); idx++; }
    if (status) { conditions.push(`e.status = $${idx}`); params.push(status); idx++; }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const countRes = await query(`SELECT COUNT(*) AS total FROM employees e ${where}`, params);
    const result = await query(
      `SELECT e.*, (SELECT COUNT(*) FROM employee_attendance a WHERE a.employee_id = e.employee_id AND a.attendance_date >= DATE_TRUNC('month', CURRENT_DATE) AND a.status IN ('Present','Half-day')) AS days_worked_this_month FROM employees e ${where} ORDER BY e.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, parseInt(limit), offset]
    );
    res.json({ success: true, employees: result.rows, pagination: { total: parseInt(countRes.rows[0].total), page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(parseInt(countRes.rows[0].total) / parseInt(limit)) } });
  } catch (err) { console.error('Get employees error:', err.message); res.status(500).json({ success: false, message: 'Failed to fetch employees.' }); }
});

// ⚠️  CRITICAL: /attendance/today MUST be BEFORE /:id
// GET /attendance/today
router.get('/attendance/today', verifyToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT e.employee_id, e.name, e.designation, e.employee_code, a.status AS attendance_status, a.check_in_time, a.check_out_time FROM employees e LEFT JOIN employee_attendance a ON e.employee_id = a.employee_id AND a.attendance_date = CURRENT_DATE WHERE e.status = 'Active' ORDER BY e.name`
    );
    res.json({ success: true, employees: result.rows, date: new Date().toISOString().split('T')[0] });
  } catch (err) { console.error('Today att error:', err.message); res.status(500).json({ success: false, message: 'Failed.' }); }
});

// GET /:id — employee detail
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const empId = parseInt(req.params.id);
    const empRes = await query('SELECT * FROM employees WHERE employee_id = $1', [empId]);
    if (empRes.rows.length === 0) return res.status(404).json({ success: false, message: 'Employee not found.' });
    const employee = empRes.rows[0];
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const attRes = await query(
      `SELECT COUNT(*) FILTER (WHERE status='Present') AS present_days, COUNT(*) FILTER (WHERE status='Half-day') AS half_days, COUNT(*) FILTER (WHERE status='Absent') AS absent_days, COUNT(*) FILTER (WHERE status='Leave') AS leave_days FROM employee_attendance WHERE employee_id=$1 AND attendance_date >= $2`,
      [empId, monthStart]
    );
    const att = attRes.rows[0];
    const presentDays = parseInt(att.present_days) + parseInt(att.half_days) * 0.5;
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const salaryEarned = (parseFloat(employee.monthly_salary) / daysInMonth) * presentDays;
    const paidRes = await query(`SELECT COALESCE(SUM(amount),0) AS total_paid FROM employee_salary_payments WHERE employee_id=$1 AND payment_date >= $2`, [empId, monthStart]);
    const allPayRes = await query(`SELECT * FROM employee_salary_payments WHERE employee_id=$1 ORDER BY payment_date DESC LIMIT 20`, [empId]);
    const purchRes = await query(`SELECT ep.*, p.product_name FROM employee_personal_purchases ep LEFT JOIN products p ON ep.product_id=p.product_id WHERE ep.employee_id=$1 ORDER BY ep.purchase_date DESC LIMIT 20`, [empId]);
    const recentAttRes = await query(`SELECT * FROM employee_attendance WHERE employee_id=$1 ORDER BY attendance_date DESC LIMIT 30`, [empId]);
    const totalPaid = parseFloat(paidRes.rows[0].total_paid) || 0;
    res.json({ success: true, employee, currentMonth: { presentDays, halfDays: parseInt(att.half_days), absentDays: parseInt(att.absent_days), leaveDays: parseInt(att.leave_days), daysInMonth, salaryEarned: salaryEarned.toFixed(2), totalPaid: totalPaid.toFixed(2), netPayable: (salaryEarned - totalPaid).toFixed(2) }, recentAttendance: recentAttRes.rows, payments: allPayRes.rows, purchases: purchRes.rows });
  } catch (err) { console.error('Get employee error:', err.message); res.status(500).json({ success: false, message: 'Failed.' }); }
});

// POST / — create
router.post('/', verifyToken, async (req, res) => {
  try {
    const { name, contact_number, address, aadhar_number, joining_date, designation, monthly_salary } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Name is required.' });
    if (!contact_number) return res.status(400).json({ success: false, message: 'Contact number is required.' });
    if (!joining_date) return res.status(400).json({ success: false, message: 'Joining date is required.' });
    const countRes = await query('SELECT COUNT(*) AS total FROM employees');
    const empCode = `EMP-${String(parseInt(countRes.rows[0].total) + 1).padStart(3, '0')}`;
    const result = await query(
      `INSERT INTO employees (employee_code, name, contact_number, address, aadhar_number, joining_date, designation, monthly_salary) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [empCode, name, contact_number, address || null, aadhar_number || null, joining_date, designation || null, parseFloat(monthly_salary) || 0]
    );
    res.status(201).json({ success: true, message: 'Employee added.', employee: result.rows[0] });
  } catch (err) { console.error('Create employee error:', err.message); res.status(500).json({ success: false, message: 'Failed.' }); }
});

// PUT /:id — update
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { name, contact_number, address, aadhar_number, joining_date, designation, monthly_salary, status } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Name is required.' });
    const result = await query(
      `UPDATE employees SET name=$1, contact_number=$2, address=$3, aadhar_number=$4, joining_date=$5, designation=$6, monthly_salary=$7, status=$8, updated_at=NOW() WHERE employee_id=$9 RETURNING *`,
      [name, contact_number, address || null, aadhar_number || null, joining_date, designation || null, parseFloat(monthly_salary) || 0, status || 'Active', parseInt(req.params.id)]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Not found.' });
    res.json({ success: true, message: 'Employee updated.', employee: result.rows[0] });
  } catch (err) { console.error('Update employee error:', err.message); res.status(500).json({ success: false, message: 'Failed.' }); }
});

// POST /:id/attendance — mark (upsert)
router.post('/:id/attendance', verifyToken, async (req, res) => {
  try {
    const { attendance_date, status, check_in_time, check_out_time, notes } = req.body;
    const empId = parseInt(req.params.id);
    if (!attendance_date) return res.status(400).json({ success: false, message: 'Date required.' });
    if (!['Present','Absent','Half-day','Leave'].includes(status)) return res.status(400).json({ success: false, message: 'Invalid status.' });
    const result = await query(
      `INSERT INTO employee_attendance (employee_id, attendance_date, status, check_in_time, check_out_time, notes, marked_by) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (employee_id, attendance_date) DO UPDATE SET status=$3, check_in_time=$4, check_out_time=$5, notes=$6, marked_by=$7 RETURNING *`,
      [empId, attendance_date, status, check_in_time || null, check_out_time || null, notes || null, req.user.userId]
    );
    res.json({ success: true, message: 'Attendance marked.', attendance: result.rows[0] });
  } catch (err) { console.error('Mark att error:', err.message); res.status(500).json({ success: false, message: 'Failed.' }); }
});

// GET /:id/attendance — month calendar data
router.get('/:id/attendance', verifyToken, async (req, res) => {
  try {
    const { month, year } = req.query;
    const m = parseInt(month) || new Date().getMonth() + 1;
    const y = parseInt(year)  || new Date().getFullYear();
    const startDate = `${y}-${String(m).padStart(2,'0')}-01`;
    const endDate   = new Date(y, m, 0).toISOString().split('T')[0];
    const result = await query(`SELECT * FROM employee_attendance WHERE employee_id=$1 AND attendance_date BETWEEN $2 AND $3 ORDER BY attendance_date`, [parseInt(req.params.id), startDate, endDate]);
    res.json({ success: true, attendance: result.rows, month: m, year: y });
  } catch (err) { console.error('Get att error:', err.message); res.status(500).json({ success: false, message: 'Failed.' }); }
});

// POST /:id/payment
router.post('/:id/payment', verifyToken, async (req, res) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const { amount, payment_type = 'Salary', month_year, payment_method = 'Cash', notes } = req.body;
    const empId = parseInt(req.params.id);
    const payAmt = parseFloat(amount);
    if (!payAmt || payAmt <= 0) throw new Error('Amount must be > 0.');
    if (!['Salary','Advance','Bonus'].includes(payment_type)) throw new Error('Invalid type.');
    await client.query(`INSERT INTO employee_salary_payments (employee_id, payment_date, amount, payment_type, month_year, payment_method, notes, paid_by) VALUES ($1,CURRENT_DATE,$2,$3,$4,$5,$6,$7)`, [empId, payAmt, payment_type, month_year || null, payment_method, notes || null, req.user.userId]);
    await client.query(`UPDATE employees SET current_balance=current_balance-$1, updated_at=NOW() WHERE employee_id=$2`, [payAmt, empId]);
    await client.query('COMMIT');
    res.json({ success: true, message: `${payment_type} of ₹${payAmt} recorded.` });
  } catch (err) { await client.query('ROLLBACK'); res.status(400).json({ success: false, message: err.message || 'Failed.' }); }
  finally { client.release(); }
});

// POST /:id/purchase
router.post('/:id/purchase', verifyToken, async (req, res) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const { product_id, quantity, unit_price, payment_status, notes } = req.body;
    const empId = parseInt(req.params.id);
    const qty   = parseInt(quantity) || 1;
    const price = parseFloat(unit_price) || 0;
    const total = qty * price;
    if (!price || price <= 0) throw new Error('Unit price required.');
    await client.query(`INSERT INTO employee_personal_purchases (employee_id,product_id,quantity,unit_price,total_amount,payment_status,notes) VALUES ($1,$2,$3,$4,$5,$6,$7)`, [empId, product_id ? parseInt(product_id) : null, qty, price, total, payment_status || 'Pending', notes || null]);
    if (payment_status === 'Deduct from Salary') await client.query(`UPDATE employees SET current_balance=current_balance-$1, updated_at=NOW() WHERE employee_id=$2`, [total, empId]);
    if (product_id) {
      await client.query(`UPDATE products SET current_stock=current_stock-$1, updated_at=NOW() WHERE product_id=$2`, [qty, parseInt(product_id)]);
      checkAndAlertLowStock(parseInt(product_id)).catch(console.error);
    }
    await client.query('COMMIT');
    res.json({ success: true, message: 'Purchase recorded.' });
  } catch (err) { await client.query('ROLLBACK'); res.status(400).json({ success: false, message: err.message || 'Failed.' }); }
  finally { client.release(); }
});

module.exports = router;
