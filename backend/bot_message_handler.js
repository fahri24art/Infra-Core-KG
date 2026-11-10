// bot_message_handler.js
// Dedicated Message Router for Power Asset Bot

module.exports = async function handleIncomingMessage(messages, type, context) {
    const { 
        sock, 
        db, 
        ostPool, 
        userStates, 
        ticketWorkflow, 
        ticketRateLimit, 
        messageQueue, 
        waStatus,
        RATE_LIMIT_MS,
        ICT_CATEGORIES,
        isTechnician,
        createTicket,
        updateTicketStatus,
        closeTicket,
        forwardTicketToContacts,
        sendWAMessage,
        addTicketReply,
        getForwardingNumbers,
        generateAITutorial
    } = context;

    try {
            if (type !== 'notify') return;

            for (const msg of messages) {
                try {
                    if (!msg.message) continue;
                
                const messageContent = msg.message.conversation || 
                                     msg.message.extendedTextMessage?.text || 
                                     '';
                
                // CRITICAL: Ignore messages from the bot itself or status broadcasts
                if (msg.key.fromMe) {
                    console.log(`[WA_Bot] Ignoring message from me (fromMe: true)`);
                    continue;
                }
                if (msg.key.remoteJid === 'status@broadcast') {
                    continue;
                }

                console.log('[WA_Bot] Incoming message JID:', msg.key.remoteJid);
                let senderNumber = msg.key.remoteJid.split('@')[0];
                senderNumber = senderNumber.replace(/[^0-9]/g, '');
                
                // Ensure number is in common format (62...)
                if (senderNumber.startsWith('0')) {
                    senderNumber = '62' + senderNumber.substring(1);
                }
                const senderName = msg.pushName || 'Unknown User';
                console.log(`[WA_Bot] Processing message from: ${senderName} (${senderNumber})`);
                
                if (messageContent.toLowerCase().includes('#ticket')) {
                    console.log(`[WA_Bot] #ticket request from ${senderName} (${senderNumber})`);
                    
                    // Check if user exists in database
                    let userExists = false;
                    try {
                        let cleanSender = senderNumber.replace(/\D/g, '');
                        let last8 = cleanSender.length > 8 ? cleanSender.slice(-8) : cleanSender;
                        const user = await db('users').where('whatsapp', 'like', `%${last8}`).first();
                        if (user) {
                            userExists = true;
                            console.log(`[WA_Bot] User exists in database: ${user.name}`);
                        }
                    } catch (err) {
                        console.error('[WA_Bot] Error checking user existence:', err);
                    }
                    
                    // If user doesn't exist, ask for registration info
                    if (!userExists) {
                        console.log(`[WA_Bot] User not found, asking for registration info`);
                        userStates.set(senderNumber, { 
                            state: 'register_name', 
                            senderName,
                            whatsapp: senderNumber 
                        });
                        
                        await sock.sendMessage(msg.key.remoteJid, {
                            text: `👋 *SELAMAT DATANG!*\n\nHalo ${senderName},\n\nSepertinya ini pertama kali Anda membuat ticket.\n\nMohon isi data diri Anda untuk registrasi:\n\n1. Nama Lengkap\n2. Department\n\nFormat:\nNama: [nama Anda]\nDepartment: [department Anda]\n\nContoh:\nNama: Budi Santoso\nDepartment: IT`
                        });
                        
                        console.log(`[WA_Bot] Asked ${senderName} for registration info`);
                        continue;
                    }
                    
                    const lastTicketTime = ticketRateLimit.get(senderNumber);
                    const now = Date.now();
                    if (lastTicketTime && (now - lastTicketTime) < RATE_LIMIT_MS) {
                        const remainingTime = Math.ceil((RATE_LIMIT_MS - (now - lastTicketTime)) / 60000);
                        await sock.sendMessage(msg.key.remoteJid, {
                            text: `⏳ *RATE LIMIT*\n\nHalo ${senderName},\n\nAnda sudah membuat ticket baru-baru ini. Silakan tunggu ${remainingTime} menit lagi sebelum membuat ticket baru. Terima kasih!`
                        });
                        console.log(`[WA_Bot] Rate limited for ${senderNumber}`);
                        continue;
                    }
                    
                    userStates.set(senderNumber, { state: 'category', senderName });
                    
                    let categoryList = '🔧 *PILIH KATEGORI MASALAH*\n\n';
                    ICT_CATEGORIES.forEach(cat => {
                        categoryList += `${cat.id}. ${cat.name}\n`;
                    });
                    categoryList += '\nBalas dengan nomor kategori (1-7)';
                    
                    await sock.sendMessage(msg.key.remoteJid, {
                        text: categoryList
                    });
                    
                    console.log(`[WA_Bot] Asked ${senderName} for category selection`);
                    continue;
                }
                
                if (messageContent.toLowerCase().startsWith('#close')) {
                    console.log(`[WA_Bot] #close request from ${senderName} (${senderNumber})`);
                    
                    // Check if sender is technician
                    // Passing the full msg object for deeper identification if needed
                    const isTech = await isTechnician(senderNumber, msg);
                    if (!isTech) {
                        await sock.sendMessage(msg.key.remoteJid, {
                            text: '❌ Maaf, hanya teknisi yang dapat menutup ticket.\nSilakan hubungi teknisi untuk penutupan ticket.'
                        });
                        console.log(`[WA_Bot] ${senderName} (JID: ${msg.key.remoteJid}) is not a technician, denying close request`);
                        continue;
                    }
                    
                    const parts = messageContent.trim().split(/\s+/);
                    const ticketNumber = parts[1];
                    
                    if (!ticketNumber) {
                        await sock.sendMessage(msg.key.remoteJid, {
                            text: '❌ Format salah. Gunakan: #close <nomor_ticket> [keterangan]\n\nContoh: #close 1000025 permasalah ada pada print server, sudah di perbaiki spooler nya'
                        });
                        continue;
                    }
                    
                    // Extract resolution note (everything after ticket number)
                    let resolutionNote = '';
                    if (parts.length > 2) {
                        resolutionNote = parts.slice(2).join(' ');
                        console.log(`[WA_Bot] Resolution note: ${resolutionNote}`);
                    }
                    
                    // Check if ticket exists in workflow (for WhatsApp-created tickets)
                    const workflow = ticketWorkflow.get(ticketNumber);
                    
                    if (!workflow) {
                        // Ticket not in workflow - close directly and notify from app database
                        console.log(`[WA_Bot] Ticket #${ticketNumber} not in workflow, closing directly...`);
                        try {
                            // Close ticket
                            const closed = await closeTicket(ticketNumber);
                            if (closed) {
                                console.log(`[WA_Bot] Ticket ${ticketNumber} closed directly (not in workflow)`);
                                
                                // Update resolution note in database if provided
                                if (resolutionNote) {
                                    try {
                                        await db('tickets').where({ number: ticketNumber }).update({ 
                                            resolution_note: resolutionNote,
                                            updated_at: new Date()
                                        });
                                        console.log(`[WA_Bot] Resolution note saved to database for ticket ${ticketNumber}`);
                                    } catch (updateErr) {
                                        console.error('[WA_Bot] Error updating resolution note:', updateErr);
                                    }
                                }
                                
                                // Get user WhatsApp from app database
                                let userWhatsApp = null;
                                try {
                                    const ticketRows = await db('tickets').where({ number: ticketNumber }).first();
                                    if (ticketRows && ticketRows.user_id) {
                                        const userRows = await db('users').where({ id: ticketRows.user_id }).first();
                                        if (userRows && userRows.whatsapp) {
                                            userWhatsApp = userRows.whatsapp;
                                            console.log(`[WA_Bot] User WhatsApp from app database: ${userWhatsApp}`);
                                        }
                                    }
                                } catch (dbErr) {
                                    console.error('[WA_Bot] Error getting user WhatsApp from app database:', dbErr);
                                }
                                
                                // Build notification message with resolution note
                                let userNotificationMessage = `✅ *TICKET DITUTUP OLEH TEKNISI*\n\nTicket #${ticketNumber} telah diselesaikan oleh teknisi.\n\n`;
                                if (resolutionNote) {
                                    userNotificationMessage += `📝 *Penjelasan Teknisi:*\n${resolutionNote}\n\n`;
                                }
                                userNotificationMessage += `Masalah sudah selesai di atasi. Jika sudah selesai, jangan balas pesan ini.\nTapi jika masih bermasalah, silahkan kirim pesan untuk melaporkan kembali.`;
                                
                                // Notify user if WhatsApp number found
                                if (userWhatsApp) {
                                    await sendWAMessage(userWhatsApp, userNotificationMessage);
                                    console.log(`[WA_Bot] User notification sent to ${userWhatsApp}`);
                                } else {
                                    console.log(`[WA_Bot] User WhatsApp not found in app database, skipping user notification`);
                                }
                                
                                // Build supervisor notification message with resolution note
                                let supervisorNotificationMessage = `🔒 *TICKET DITUTUP*\n\nTicket #${ticketNumber} telah ditutup oleh teknisi.\n\n`;
                                if (resolutionNote) {
                                    supervisorNotificationMessage += `📝 *Penjelasan Teknisi:*\n${resolutionNote}\n\n`;
                                }
                                supervisorNotificationMessage += `Status: Closed\nTeknisi: ${senderName}\n\nTerima kasih.`;
                                
                                // Notify supervisor about ticket closure
                                const { supervisorNumber } = await getForwardingNumbers();
                                if (supervisorNumber) {
                                    await sendWAMessage(supervisorNumber, supervisorNotificationMessage);
                                    console.log(`[WA_Bot] Notified supervisor about ticket closure`);
                                }
                                
                                // Notify technician
                                await sock.sendMessage(msg.key.remoteJid, {
                                    text: `✅ *TICKET DITUTUP*\n\nTicket #${ticketNumber} berhasil ditutup.\n\nNotifikasi telah dikirim ke user dan supervisor.\n\nTerima kasih!`
                                });
                            } else {
                                await sock.sendMessage(msg.key.remoteJid, {
                                    text: `❌ Ticket #${ticketNumber} tidak ditemukan.`
                                });
                            }
                        } catch (err) {
                            console.error('[WA_Bot] Error closing ticket directly:', err);
                            await sock.sendMessage(msg.key.remoteJid, {
                                text: `❌ Gagal menutup ticket #${ticketNumber}. Silakan coba lagi.`
                            });
                        }
                        continue;
                    }
                    
                    // Ticket is in workflow - close directly and notify
                    await closeTicket(ticketNumber);
                    
                    // Update resolution note in database if provided
                    if (resolutionNote) {
                        try {
                            await db('tickets').where({ number: ticketNumber }).update({ 
                                resolution_note: resolutionNote,
                                updated_at: new Date()
                            });
                            console.log(`[WA_Bot] Resolution note saved to database for ticket ${ticketNumber}`);
                        } catch (updateErr) {
                            console.error('[WA_Bot] Error updating resolution note:', updateErr);
                        }
                    }
                    
                    // Notify user
                    let userJid = workflow.senderNumber;
                    console.log(`[WA_Bot] workflow.senderNumber:`, userJid);
                    console.log(`[WA_Bot] workflow object:`, JSON.stringify(workflow));
                    // Ensure userJid is a string
                    if (typeof userJid !== 'string') {
                        userJid = String(userJid);
                    }
                    console.log(`[WA_Bot] userJid after string conversion:`, userJid);
                    if (userJid && userJid.trim() !== '') {
                        console.log(`[WA_Bot] Sending notification to user:`, userJid);
                        if (!userJid.includes('@')) {
                            userJid = userJid.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
                        }
                        
                        // Build user notification message with resolution note
                        let userNotificationMessage = `✅ *TICKET DITUTUP OLEH TEKNISI*\n\nTicket #${ticketNumber} telah diselesaikan oleh teknisi.\n\n`;
                        if (resolutionNote) {
                            userNotificationMessage += `� *Penjelasan Teknisi:*\n${resolutionNote}\n\n`;
                        }
                        userNotificationMessage += `� Kategori: ${workflow.category}\n�� Masalah: ${workflow.description}\n\n`;
                        userNotificationMessage += `Masalah sudah selesai di atasi. Jika sudah selesai, jangan balas pesan ini.\nTapi jika masih bermasalah, silahkan kirim pesan untuk melaporkan kembali.`;
                        
                        await sock.sendMessage(userJid, {
                            text: userNotificationMessage
                        });
                        console.log(`[WA_Bot] User notification sent successfully`);
                    } else {
                        console.log(`[WA_Bot] userJid is empty, skipping user notification`);
                    }
                    
                    // Build supervisor notification message with resolution note
                    let supervisorNotificationMessage = `🔒 *TICKET DITUTUP*\n\nTicket #${ticketNumber} telah ditutup oleh teknisi.\n\n`;
                    if (resolutionNote) {
                        supervisorNotificationMessage += `📝 *Penjelasan Teknisi:*\n${resolutionNote}\n\n`;
                    }
                    supervisorNotificationMessage += `Status: Closed\nTeknisi: ${senderName}\nKategori: ${workflow.category}\n\nTerima kasih.`;
                    
                    // Notify supervisor
                    const { supervisorNumber } = await getForwardingNumbers();
                    if (supervisorNumber) {
                        await sendWAMessage(supervisorNumber, supervisorNotificationMessage);
                    }
                    
                    // Notify technician
                    await sock.sendMessage(msg.key.remoteJid, {
                        text: `✅ *TICKET DITUTUP*\n\nTicket #${ticketNumber} berhasil ditutup.\n\nNotifikasi telah dikirim ke user dan supervisor.\n\nTerima kasih!`
                    });
                    
                    // Remove from workflow
                    ticketWorkflow.delete(ticketNumber);
                    
                    console.log(`[WA_Bot] Ticket ${ticketNumber} closed by technician ${senderName}`);
                    continue;
                }
                
                // Handle technician confirmation with "OK"
                if (messageContent.toLowerCase().trim() === 'ok') {
                    const isTech = await isTechnician(senderNumber, msg);
                    if (isTech) {
                        // Find ticket that needs technician confirmation
                        for (const [ticketNum, workflow] of ticketWorkflow.entries()) {
                            if (!workflow.technicianConfirmed && workflow.technicianNumber) {
                                const cleanTech = workflow.technicianNumber.replace(/[^0-9]/g, '');
                                const cleanSender = senderNumber.replace(/[^0-9]/g, '');
                                if (cleanTech === cleanSender) {
                                    // Technician confirmed
                                    workflow.technicianConfirmed = true;
                                    workflow.technicianConfirmedAt = Date.now();
                                    ticketWorkflow.set(ticketNum, workflow);
                                    
                                    // Update status to In Progress
                                    await updateTicketStatus(ticketNum, 'In Progress');
                                    
                                    await sock.sendMessage(msg.key.remoteJid, {
                                        text: `✅ *KONFIRMASI DITERIMA*\n\nTicket #${ticketNum} status diubah ke "In Progress".\n\nSilakan selesaikan penanganan dan gunakan #close ${ticketNum} setelah selesai.`
                                    });
                                    
                                    console.log(`[WA_Bot] Technician ${senderName} confirmed ticket ${ticketNum}`);
                                    break;
                                }
                            }
                        }
                    }
                    continue;
                }
                
                // Handle user creation flow (Category/Description) - PRIORITIZED
                const userState = userStates.get(senderNumber);
                if (userState) {
                    // Handle registration state
                    if (userState.state === 'register_name') {
                        console.log(`[WA_Bot] Processing registration for ${senderNumber}`);
                        
                        // Parse name and department from message
                        let userName = '';
                        let userDepartment = '';
                        
                        const lines = messageContent.split('\n');
                        for (const line of lines) {
                            const lowerLine = line.toLowerCase();
                            // Check for name variations
                            if (lowerLine.includes('nama:') || lowerLine.includes('name:')) {
                                const parts = line.split(/[:]/);
                                if (parts.length > 1) {
                                    userName = parts[1].trim();
                                }
                            }
                            // Check for department variations (including typo "departement")
                            if (lowerLine.includes('department:') || lowerLine.includes('departement:') || lowerLine.includes('dept:')) {
                                const parts = line.split(/[:]/);
                                if (parts.length > 1) {
                                    userDepartment = parts[1].trim();
                                }
                            }
                        }
                        
                        // Fallback: if format not followed, try simple parsing
                        if (!userName || !userDepartment) {
                            const parts = messageContent.split(/[,\/\n]/);
                            if (parts.length >= 2) {
                                userName = parts[0].trim() || userState.senderName;
                                userDepartment = parts[1].trim() || '';
                            }
                        }
                        
                        // Final fallback
                        if (!userName) userName = userState.senderName;
                        if (!userDepartment) userDepartment = 'General';
                        
                        console.log(`[WA_Bot] Registration info - Name: ${userName}, Department: ${userDepartment}, WhatsApp: ${userState.whatsapp}`);
                        
                        try {
                            // Insert user into database
                            await db('users').insert({
                                name: userName,
                                email: `${userState.whatsapp}@whatsapp.temp`, // Temporary email
                                password: '', // No password for WhatsApp users
                                role: 'user',
                                department: userDepartment,
                                whatsapp: userState.whatsapp
                            });
                            
                            console.log(`[WA_Bot] User registered successfully: ${userName}`);
                            
                            await sock.sendMessage(msg.key.remoteJid, {
                                text: `✅ *REGISTRASI BERHASIL*\n\nSelamat datang, ${userName}!\n\nData Anda telah terdaftar:\n👤 Nama: ${userName}\n🏢 Department: ${userDepartment}\n📱 WhatsApp: ${userState.whatsapp}\n\nSekarang Anda dapat membuat ticket. Silakan kirim:\n#ticket\nuntuk memulai.`
                            });
                            
                            // Clear registration state
                            userStates.delete(senderNumber);
                            
                        } catch (err) {
                            console.error('[WA_Bot] Error registering user:', err);
                            await sock.sendMessage(msg.key.remoteJid, {
                                text: `❌ *REGISTRASI GAGAL*\n\nTerjadi kesalahan saat registrasi. Silakan coba lagi.`
                            });
                            userStates.delete(senderNumber);
                        }
                        
                        continue;
                    }
                    
                    if (userState.state === 'category') {
                        const categoryNumber = parseInt(messageContent.trim());
                        const category = ICT_CATEGORIES.find(c => c.id === categoryNumber);
                        
                        if (!category) {
                            await sock.sendMessage(msg.key.remoteJid, {
                                text: '❌ Pilihan tidak valid. Silakan pilih nomor 1-7.'
                            });
                            continue;
                        }
                        
                        userStates.set(senderNumber, { state: 'description', category: category, senderName: userState.senderName });
                        
                        await sock.sendMessage(msg.key.remoteJid, {
                            text: `✅ Kategori: ${category.name}\n\nSilakan jelaskan masalah Anda dengan detail.`
                        });
                        
                        console.log(`[WA_Bot] ${senderNumber} selected category: ${category.name}`);
                        continue;
                    }
                    
                    if (userState.state === 'description') {
                        const category = userState.category;
                        const description = messageContent.trim();
                        
                        try {
                            // [AUTO-INVENTORY] Fetch linked asset
                            let assetLine = "";
                            let fullDescription = `[#${category.name}] ${description}`;
                            
                            try {
                                let cleanSender = senderNumber.replace(/\D/g, '');
                        let last8 = cleanSender.length > 8 ? cleanSender.slice(-8) : cleanSender;
                        const user = await db('users').where('whatsapp', 'like', `%${last8}`).first();
                                if (user) {
                                    const asset = await db('assets').where({ user_id: user.id }).first();
                                    if (asset) {
                                        assetLine = `\n💻 Aset Anda: ${asset.name} (INV: ${asset.inventory_number || '-'})`;
                                        fullDescription += `\n\n--- [Auto-Inventory Info] ---\nAset Terkait: ${asset.name}\nINV: ${asset.inventory_number || '-'}`;
                                    }
                                }
                            } catch (err) {
                                console.error('[WA_Bot] Error fetching asset info:', err);
                            }

                            const ticketNumber = await createTicket(senderName, senderNumber, fullDescription);
                            
                            if (!ticketNumber) {
                                await sock.sendMessage(msg.key.remoteJid, {
                                    text: '❌ Maaf, terjadi kesalahan saat menyimpan tiket ke database. Silakan hubungi IT.'
                                });
                                userStates.delete(senderNumber);
                                continue;
                            }
                            
                            ticketRateLimit.set(senderNumber, Date.now());
                            userStates.delete(senderNumber);
                            
                            const tutorial = category.tutorial || `📋 *Tutorial Umum*\n\n1. Restart perangkat terkait\n2. Cek koneksi dasar (power/network)\n3. Jelaskan detail masalah ke IT support\n4. Screenshot error jika ada\n5. Tunggu teknisi untuk pemeriksaan offline`;
                            
                            await sock.sendMessage(msg.key.remoteJid, {
                                text: `🎫 *TICKET DIBUAT*\n\nHalo ${senderName},${assetLine}\n\n📋 Nomor: ${ticketNumber}\n📂 Kategori: ${category.name}\n📝 Masalah: ${description}\n\n---\n${tutorial}\n\n---\n\nTim IT akan segera memeriksa secara fisik/offline. Terima kasih!`
                            });
                            
                            console.log(`[WA_Bot] Ticket ${ticketNumber} created for ${senderNumber} with category ${category.name}`);
                            
                            // Forward ticket to supervisor and technician
                            console.log('[WA_Bot] About to call forwardTicketToContacts...');
                            await forwardTicketToContacts(ticketNumber, category.name, description, senderName, senderNumber);
                            console.log('[WA_Bot] forwardTicketToContacts call completed');
                        } catch (err) {
                            console.error('[WA_Bot] Error creating ticket:', err);
                            await sock.sendMessage(msg.key.remoteJid, {
                                text: '❌ Maaf, terjadi kesalahan saat membuat ticket. Silakan coba lagi nanti.'
                            });
                            userStates.delete(senderNumber);
                        }
                        continue;
                    }
                }

                // Handle user approval for ticket closing
                const normalizedMsg = messageContent.toLowerCase().trim();
                if (normalizedMsg === '1' || normalizedMsg === 'sudah terselesaikan') {
                    // Check if user has pending approval
                    let approvalHandled = false;
                    for (const [ticketNum, workflow] of ticketWorkflow.entries()) {
                        if (workflow.userApprovalTimer && !workflow.userApproved) {
                            const cleanSender = workflow.senderNumber.replace(/[^0-9]/g, '');
                            const cleanUser = senderNumber.replace(/[^0-9]/g, '');
                            if (cleanSender === cleanUser) {
                                // User approved
                                clearTimeout(workflow.userApprovalTimer);
                                workflow.userApproved = true;
                                workflow.userApprovedAt = Date.now();
                                ticketWorkflow.set(ticketNum, workflow);
                                
                                // Close ticket
                                await closeTicket(ticketNum);
                                
                                // Notify SPV
                                const { supervisorNumber } = await getForwardingNumbers();
                                if (supervisorNumber) {
                                    await sendWAMessage(supervisorNumber, 
                                        `✅ *TICKET DITUTUP - USER APPROVED*\n\n` +
                                        `Ticket #${ticketNum} ditutup dengan konfirmasi user.\n` +
                                        `📂 Kategori: ${workflow.category}\n` +
                                        `📝 Masalah: ${workflow.description}\n` +
                                        `👤 Pelapor: ${workflow.senderName}\n` +
                                        `🔧 Teknisi: ${workflow.technicianNumber}`
                                    );
                                }
                                
                                await sock.sendMessage(msg.key.remoteJid, {
                                    text: `✅ *TICKET DITUTUP*\n\nTicket #${ticketNum} berhasil ditutup.\n\nTerima kasih telah menggunakan layanan IT Helpdesk!`
                                });
                                
                                console.log(`[WA_Bot] User ${senderName} approved closing of ticket ${ticketNum}`);
                                approvalHandled = true;
                                break;
                            }
                        }
                    }
                    if (approvalHandled) continue;
                }
                
                // Handle user rejection (ticket still problematic)
                if (normalizedMsg === '2' || normalizedMsg === 'masih bermasalah') {
                    // Check if user has pending approval
                    let rejectionHandled = false;
                    for (const [ticketNum, workflow] of ticketWorkflow.entries()) {
                        if (workflow.userApprovalTimer && !workflow.userApproved) {
                            const cleanSender = workflow.senderNumber.replace(/[^0-9]/g, '');
                            const cleanUser = senderNumber.replace(/[^0-9]/g, '');
                            if (cleanSender === cleanUser) {
                                // User rejected - ask for explanation
                                clearTimeout(workflow.userApprovalTimer);
                                workflow.awaitingExplanation = true;
                                ticketWorkflow.set(ticketNum, workflow);
                                
                                await sock.sendMessage(msg.key.remoteJid, {
                                    text: `⚠️ *MENUNGGU PENJELASAN*\n\nMohon jelaskan masalah apa yang masih terjadi agar teknisi dapat menindaklanjuti kembali.\n\nSilakan ketik penjelasan masalah Anda:`
                                });
                                
                                console.log(`[WA_Bot] User ${senderName} selected "masih bermasalah" for ticket ${ticketNum}`);
                                rejectionHandled = true;
                                break;
                            }
                        }
                    }
                    if (rejectionHandled) continue;
                }
                
                // Handle user explanation after selecting "masih bermasalah"
                for (const [ticketNum, workflow] of ticketWorkflow.entries()) {
                    if (workflow.awaitingExplanation) {
                        const cleanSender = workflow.senderNumber.replace(/[^0-9]/g, '');
                        const cleanUser = senderNumber.replace(/[^0-9]/g, '');
                        if (cleanSender === cleanUser) {
                            // User provided explanation
                            const explanation = messageContent;
                            workflow.awaitingExplanation = false;
                            ticketWorkflow.set(ticketNum, workflow);
                            
                            // Reopen ticket
                            await updateTicketStatus(ticketNum, 'Open');
                            
                            // Notify technician with explanation
                            if (workflow.technicianNumber) {
                                await sendWAMessage(workflow.technicianNumber,
                                    `⚠️ *TICKET DIBUKA KEMBALI - USER REJECTED*\n\n` +
                                    `Ticket #${ticketNum} dibuka kembali karena user masih mengalami masalah.\n` +
                                    `📂 Kategori: ${workflow.category}\n` +
                                    `📝 Masalah: ${workflow.description}\n` +
                                    `👤 Pelapor: ${workflow.senderName}\n` +
                                    `💬 Penjelasan user: ${explanation}\n\n` +
                                    `Mohon segera ditindaklanjuti kembali.`
                                );
                            }
                            
                            await sock.sendMessage(msg.key.remoteJid, {
                                text: `⚠️ *TICKET DIBUKA KEMBALI*\n\nTicket #${ticketNum} dibuka kembali.\n\nTeknisi akan segera menindaklanjuti kembali. Terima kasih atas penjelasannya!`
                            });
                            
                            // Remove from workflow
                            ticketWorkflow.delete(ticketNum);
                            
                            console.log(`[WA_Bot] User ${senderName} provided explanation for ticket ${ticketNum}: ${explanation}`);
                            break;
                        }
                    }
                }
                // End of state handlers
                
                // Default response for unknown messages - only if user is not in a state
                if (!userState) {
                    await sock.sendMessage(msg.key.remoteJid, {
                        text: `👋 *Halo ${senderName}!*\n\n` +
                            `Sepertinya pesan tidak dikenali.\n\n` +
                            `Untuk membuat permintaan support, silakan ketik:\n` +
                            `📌 *#ticket*\n\n` +
                            `Contoh:\n` +
                            `#ticket\n\n` +
                            `Terima kasih! 😊`
                    });
                    console.log(`[WA_Bot] Sent default response to ${senderName} for unknown message`);
                }
                
                if (ostPool) {
                    try {
                        const [tickets] = await ostPool.query(`
                            SELECT t.ticket_id, t.number, u.id as user_id
                            FROM ost_ticket t
                            JOIN ost_user u ON t.user_id = u.id
                            JOIN ost_user_email e ON t.user_email_id = e.id
                            WHERE e.address LIKE ?
                            ORDER BY t.created DESC
                            LIMIT 1
                        `, [`${senderNumber}%`]);
                        
                        if (tickets.length > 0) {
                            const ticket = tickets[0];
                            console.log(`[WA_Bot] Reply to existing ticket #${ticket.number} from ${senderName}`);
                            
                            await addTicketReply(ticket.ticket_id, ticket.user_id, senderName, messageContent);
                            await ostPool.query(`UPDATE ost_ticket SET updated = NOW() WHERE ticket_id = ?`, [ticket.ticketId]);
                        }
                    } catch (err) {
                        console.error('[WA_Bot] Error adding reply to ticket:', err);
                    }
                }
            } catch (err) {
                console.error('[WA_Bot] Error processing message:', err);
                console.error('[WA_Bot] Error stack:', err.stack);
            }
        }
    } catch(err) { console.error('[WA_Bot Handler Error]', err); }
}