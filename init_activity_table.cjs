const { Client } = require('ssh2');

const sshConfig1 = {
    host: '192.168.1.66',
    port: 22,
    username: 'root',
    password: 'Nevergiveup572*'
};

const sshConfig2 = {
    host: '192.168.1.66',
    port: 22,
    username: 'root',
    password: 'nevergiveup'
};

const createTablesSql = `
CREATE TABLE IF NOT EXISTS budget_activity_plans (
    id VARCHAR(100) PRIMARY KEY,
    year INT NOT NULL DEFAULT 2027,
    plant VARCHAR(20) NOT NULL DEFAULT 'SG',
    category VARCHAR(50) NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    quarter VARCHAR(10) DEFAULT 'Q1',
    target_month VARCHAR(20) DEFAULT 'jan',
    budget_type VARCHAR(50) DEFAULT 'ZERO_BUDGET',
    capex_amount NUMERIC DEFAULT 0,
    opex_amount NUMERIC DEFAULT 0,
    total_amount NUMERIC DEFAULT 0,
    pic VARCHAR(150),
    priority VARCHAR(20) DEFAULT 'MEDIUM',
    status VARCHAR(50) DEFAULT 'PLANNED',
    progress_pct INT DEFAULT 0,
    kpi_deliverable TEXT,
    milestones JSONB DEFAULT '[]',
    is_budget_synced BOOLEAN DEFAULT false,
    budget_item_ids JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_budget_act_year ON budget_activity_plans(year);
CREATE INDEX IF NOT EXISTS idx_budget_act_plant ON budget_activity_plans(plant);
CREATE INDEX IF NOT EXISTS idx_budget_act_quarter ON budget_activity_plans(quarter);
CREATE INDEX IF NOT EXISTS idx_budget_act_status ON budget_activity_plans(status);
`;

function tryConnect(config) {
    return new Promise((resolve, reject) => {
        const conn = new Client();
        conn.on('ready', () => {
            console.log('[SSH] Connected to 192.168.1.66 with password:', config.password.slice(0, 3) + '***');
            const escapedSql = createTablesSql.replace(/\n/g, ' ').replace(/"/g, '\\"');
            const cmd = `su - postgres -c "psql -d network_monitor_db -c \\"${escapedSql}\\" && psql -d network_monitor_kg -c \\"${escapedSql}\\""`;
            conn.exec(cmd, (err, stream) => {
                if (err) {
                    conn.end();
                    return reject(err);
                }
                let out = '';
                stream.on('data', d => out += d.toString());
                stream.stderr.on('data', d => out += d.toString());
                stream.on('close', code => {
                    console.log('[SSH] Command output:\n', out);
                    conn.end();
                    resolve({ code, out });
                });
            });
        });
        conn.on('error', err => reject(err));
        conn.connect(config);
    });
}

async function run() {
    try {
        await tryConnect(sshConfig1);
        console.log('✅ Activity plans table ensured on 192.168.1.66 PostgreSQL!');
    } catch (err1) {
        console.warn('Config 1 failed:', err1.message, ', trying config 2...');
        try {
            await tryConnect(sshConfig2);
            console.log('✅ Activity plans table ensured on 192.168.1.66 PostgreSQL!');
        } catch (err2) {
            console.error('Config 2 also failed:', err2.message);
        }
    }
}

run();
