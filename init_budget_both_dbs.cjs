const { Client } = require('ssh2');

const sshConfig = {
    host: '192.168.1.66',
    port: 22,
    username: 'root',
    password: 'Nevergiveup572*'
};

const createTablesSql = `
CREATE TABLE IF NOT EXISTS budget_items (
    id VARCHAR(100) PRIMARY KEY,
    year INT NOT NULL,
    department VARCHAR(100),
    plant VARCHAR(20) DEFAULT 'SG',
    form VARCHAR(20) DEFAULT 'I-1',
    form_title VARCHAR(255),
    doc_no VARCHAR(100),
    category VARCHAR(50),
    category_badge VARCHAR(50),
    sub_category VARCHAR(255),
    coa_code VARCHAR(50),
    coa_name VARCHAR(255),
    item_name TEXT NOT NULL,
    type_asset VARCHAR(50),
    usage_2025 NUMERIC DEFAULT 0,
    unit_price NUMERIC DEFAULT 0,
    qty NUMERIC DEFAULT 1,
    total_amount NUMERIC DEFAULT 0,
    monthly JSONB DEFAULT '{}',
    notes TEXT,
    is_custom BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS budget_department_requests (
    id VARCHAR(100) PRIMARY KEY,
    req_no VARCHAR(100) UNIQUE NOT NULL,
    date DATE NOT NULL,
    plant VARCHAR(20) NOT NULL,
    department VARCHAR(100) NOT NULL,
    requester_name VARCHAR(150) NOT NULL,
    requester_title VARCHAR(150),
    category VARCHAR(50) NOT NULL,
    item_name TEXT NOT NULL,
    qty NUMERIC DEFAULT 1,
    unit VARCHAR(50) DEFAULT 'Unit',
    estimated_unit_price NUMERIC DEFAULT 0,
    estimated_total_cost NUMERIC DEFAULT 0,
    target_year INT NOT NULL DEFAULT 2027,
    target_month VARCHAR(20) DEFAULT 'jan',
    target_form VARCHAR(20) DEFAULT 'I-1',
    technical_specs TEXT,
    justification TEXT,
    status VARCHAR(50) DEFAULT 'SUBMITTED',
    reviewed_by VARCHAR(150),
    review_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS budget_software_licenses (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    plant VARCHAR(20),
    department VARCHAR(100),
    vendor VARCHAR(150),
    license_type VARCHAR(50),
    total_seats INT DEFAULT 1,
    used_seats INT DEFAULT 1,
    annual_cost NUMERIC DEFAULT 0,
    renewal_date DATE,
    expiration_date DATE,
    amc_included BOOLEAN DEFAULT true,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    budget_form VARCHAR(20) DEFAULT 'F1',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_budget_items_year ON budget_items(year);
CREATE INDEX IF NOT EXISTS idx_budget_items_plant ON budget_items(plant);
CREATE INDEX IF NOT EXISTS idx_budget_dept_req_year ON budget_department_requests(target_year);
CREATE INDEX IF NOT EXISTS idx_budget_dept_req_plant ON budget_department_requests(plant);
CREATE INDEX IF NOT EXISTS idx_budget_dept_req_status ON budget_department_requests(status);
`;

const conn = new Client();
conn.on('ready', () => {
    console.log('[SSH] Connected to Server 66');
    const escapedSql = createTablesSql.replace(/\n/g, ' ').replace(/"/g, '\\"');
    // Ensure on both network_monitor_db and network_monitor_kg
    const cmd = `su - postgres -c "psql -d network_monitor_db -c \\"${escapedSql}\\" && psql -d network_monitor_kg -c \\"${escapedSql}\\""`;
    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('data', d => process.stdout.write(d.toString()));
        stream.stderr.on('data', d => process.stderr.write(d.toString()));
        stream.on('close', code => {
            console.log('[SSH] DB init finished with code:', code);
            conn.end();
        });
    });
}).connect(sshConfig);
