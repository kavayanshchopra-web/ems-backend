import{a as L,n as U,t as H}from"./jsx-runtime-m-EpYe9t.js";import{t as J}from"./bell-BjA08T8l.js";import{t as F}from"./check-F7YN626d.js";import{t as K}from"./chevron-down-B7yXWegj.js";import{t as Q}from"./laptop-CRZaMet_.js";import{t as G}from"./phone-call-BV-h4_Hn.js";import{t as Y}from"./plus-C9FFjyBa.js";import{t as Z}from"./refresh-cw-BHLiGbGV.js";import{n as V}from"./index-CjM-_Ecq.js";var c=L(U(),1),e=H();function fe({authUser:E,sessions:R=[],contacts:X=[],activeContact:f,setActiveContact:ee,setActiveTab:te}){const s=String(E?.tenantId||E?.companyId||typeof window<"u"&&window.__omniflow_tenant||"default_tenant"),[A,N]=(0,c.useState)(()=>{try{const t=localStorage.getItem(`omniflow_custom_staff_${s}`)||localStorage.getItem("omniflow_custom_staff_accounts");if(t)return JSON.parse(t)}catch{}return[{id:"primary",name:"Primary Account",phone:"Scan QR to connect",status:"idle"}]}),[h,D]=(0,c.useState)(()=>localStorage.getItem(`omniflow_selected_staff_id_${s}`)||localStorage.getItem("omniflow_selected_staff_id")||"primary"),[_,P]=(0,c.useState)(()=>{try{const t=localStorage.getItem(`omniflow_staff_unreads_${s}`)||localStorage.getItem("omniflow_staff_unreads");if(t)return JSON.parse(t)}catch{}return{}}),[b,S]=(0,c.useState)(!1),[M,y]=(0,c.useState)(!1),[I,k]=(0,c.useState)(""),[j,C]=(0,c.useState)(Date.now()),[ne,B]=(0,c.useState)(null),l=(0,c.useRef)(null),T=(0,c.useRef)(null),z=(R||[]).filter(t=>t?s!=="1"&&s!=="default_tenant"?String(t.tenant_id||t.tenantId||"")===s:!0:!1),w=z.length>0?z.map((t,n)=>({id:t.id||`staff_${n+1}`,name:t.name||`Staff ${n+1}`,phone:t.phone_number||t.phone||`Account ${n+1}`,status:t.status==="connected"?"connected":"idle"})):A,m=(w||[]).find(t=>t&&t.id===h)||w&&w[0]||null;(0,c.useEffect)(()=>{const t=l.current;if(!t)return;const n=i=>{const r=(i.title||"").match(/^\((\d+)\)/),d=r?parseInt(r[1],10):0;P(p=>{const a={...p,[h]:d};try{localStorage.setItem("omniflow_staff_unreads",JSON.stringify(a))}catch{}return a})};return t.addEventListener("page-title-updated",n),window.__omniflow_send_whatsapp_message=async({phone:i,text:r})=>{const d=String(i||"").replace(/\D/g,"");if(!d||!r)return{success:!1,error:"Phone and text required"};const p=d.length===10?`91${d}`:d,a=l.current;if(!a)return{success:!1,error:"WhatsApp Webview not mounted"};try{if(a.executeJavaScript){const o=`
            (function() {
              try {
                const targetNumber = "${p}";
                const textMsg = ${JSON.stringify(r)};
                const targetUrl = 'https://web.whatsapp.com/send?phone=' + targetNumber + '&text=' + encodeURIComponent(textMsg);

                function attemptSend() {
                  // 1. Try finding Send button and click it
                  const sendBtn = document.querySelector('button[aria-label="Send"], button[data-testid="compose-btn-send"], span[data-icon="send"], span[data-icon="send-light"], button span[data-icon="send"], footer button:has(span[data-icon="send"]), footer button:last-child');
                  if (sendBtn) {
                    const actualBtn = sendBtn.tagName === 'BUTTON' ? sendBtn : (sendBtn.closest('button') || sendBtn);
                    ['pointerdown', 'mousedown', 'focus', 'pointerup', 'mouseup', 'click'].forEach(evtType => {
                      actualBtn.dispatchEvent(new MouseEvent(evtType, { bubbles: true, cancelable: true, view: window }));
                    });
                    return true;
                  }

                  // 2. Dispatch Enter keys on active contenteditable input
                  const textBox = document.querySelector('footer div[contenteditable="true"], div[role="textbox"][contenteditable="true"], div[data-testid="conversation-compose-box-input"]');
                  if (textBox && textBox.innerText.trim().length > 0) {
                    textBox.focus();
                    ['keydown', 'keypress', 'keyup'].forEach(kType => {
                      textBox.dispatchEvent(new KeyboardEvent(kType, { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true }));
                    });
                    return true;
                  }
                  return false;
                }

                // Check if current open chat matches targetNumber
                let currentChatPhone = '';
                try {
                  const mainEl = document.querySelector('#main') || document.querySelector('header');
                  if (mainEl) {
                    const fiberKey = Object.keys(mainEl).find(k => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$'));
                    if (fiberKey) {
                      let curr = mainEl[fiberKey];
                      let depth = 0;
                      while (curr && depth < 35) {
                        const chat = curr.memoizedProps?.chat || curr.memoizedProps?.conversation;
                        if (chat && chat.id?._serialized) {
                          currentChatPhone = String(chat.id._serialized).split('@')[0].replace(/\\D/g, '');
                          break;
                        }
                        curr = curr.return;
                        depth++;
                      }
                    }
                  }
                } catch (e) {}

                const current10 = currentChatPhone ? currentChatPhone.slice(-10) : '';
                const target10 = targetNumber.slice(-10);

                // If already on the same chat, insert and send immediately
                if (current10 && target10 && current10 === target10) {
                  const currentInput = document.querySelector('footer div[contenteditable="true"], div[role="textbox"][contenteditable="true"]');
                  if (currentInput) {
                    currentInput.focus();
                    document.execCommand('selectAll', false, null);
                    document.execCommand('insertText', false, textMsg);
                    currentInput.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true }));
                    setTimeout(attemptSend, 100);
                    return { success: true, method: 'immediate_chat_matched' };
                  }
                }

                // Otherwise, navigate to send link
                window.location.href = targetUrl;
                return { success: true, method: 'navigated_to_send_url', targetNumber };
              } catch(err) {
                return { success: false, error: err.message };
              }
            })()
          `,g=await a.executeJavaScript(o);let x=0;const u=setInterval(()=>{x++;try{a.sendInputEvent&&(a.sendInputEvent({type:"keyDown",keyCode:"Return"}),a.sendInputEvent({type:"char",keyCode:"\r"}),a.sendInputEvent({type:"keyUp",keyCode:"Return"}))}catch{}x>15&&clearInterval(u)},350);return{success:!0,result:g}}else if(a.src)return a.src=`https://web.whatsapp.com/send?phone=${p}&text=${encodeURIComponent(r)}`,{success:!0,method:"src_nav"}}catch(o){return{success:!1,error:o.message}}},()=>{t.removeEventListener("page-title-updated",n),delete window.__omniflow_send_whatsapp_message}},[h,j]),(0,c.useEffect)(()=>{const t=l.current;if(!t)return;let n=null;const i=async()=>{try{if(!t.executeJavaScript)return;const d=f?String(f.phone||f.rawPhone||f.phoneNumber||"").replace(/\D/g,""):"",p=f?.name||"",a=`
          (function() {
            try {
              function parsePhoneFromJid(jid) {
                if (!jid) return '';
                return String(jid).split('@')[0].replace(/\\D/g, '');
              }

              // AUTO-SEND HANDLER: Strictly only runs during programmatic /send?phone= navigation
              try {
                const currentHref = window.location.href || '';
                if (currentHref.includes('/send?phone=') || currentHref.includes('omniflow_auto=1')) {
                  const sendBtn = document.querySelector('button[aria-label="Send"], button[data-testid="compose-btn-send"], span[data-icon="send"], span[data-icon="send-light"], button span[data-icon="send"], footer button:has(span[data-icon="send"])');
                  if (sendBtn) {
                    const actualBtn = sendBtn.tagName === 'BUTTON' ? sendBtn : (sendBtn.closest('button') || sendBtn);
                    ['pointerdown', 'mousedown', 'focus', 'pointerup', 'mouseup', 'click'].forEach(evtType => {
                      actualBtn.dispatchEvent(new MouseEvent(evtType, { bubbles: true, cancelable: true, view: window }));
                    });
                    try { window.history.replaceState({}, '', '/'); } catch(e) {}
                  }
                }
              } catch (sendErr) {}

              // 1. Multi-Strategy Phone Number & Chat Title Extractor
              let phone = '';
              let chatTitle = '';

              // Strategy A: Scan data-id attributes of messages in #main for exact JID
              const allDataIdEls = Array.from(document.querySelectorAll('#main *[data-id], *[data-id]'));
              for (const el of allDataIdEls) {
                const dId = el.getAttribute('data-id') || '';
                const m = dId.match(/([0-9]{7,15})@(c.us|s.whatsapp.net)/);
                if (m && m[1]) {
                  phone = m[1];
                  break;
                }
              }

              // Strategy B: Scan active chat item in left sidebar
              if (!phone) {
                const activeSideItem = document.querySelector('#pane-side div[aria-selected="true"], #pane-side div[role="listitem"]:has([aria-selected="true"]), #pane-side div[role="row"]:has([aria-selected="true"])');
                if (activeSideItem) {
                  const rawHtml = activeSideItem.outerHTML || '';
                  const m = rawHtml.match(/([0-9]{7,15})@(c.us|s.whatsapp.net)/);
                  if (m && m[1]) phone = m[1];
                }
              }

              // Strategy C: Multi-Root React Fiber Traversal
              if (!phone || !chatTitle) {
                try {
                  const candidateEls = [
                    document.querySelector('#main'),
                    document.querySelector('#main header'),
                    document.querySelector('#pane-side div[aria-selected="true"]'),
                    document.querySelector('#main footer'),
                    document.querySelector('#app')
                  ].filter(Boolean);

                  for (const el of candidateEls) {
                    const fiberKey = Object.keys(el).find(k => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$'));
                    if (!fiberKey) continue;
                    let curr = el[fiberKey];
                    let d = 0;
                    while (curr && d < 40) {
                      const p = curr.memoizedProps;
                      if (p) {
                        const c = p.chat || p.conversation || p.contact || p.data?.chat;
                        if (c) {
                          if (!chatTitle) chatTitle = c.name || c.formattedTitle || c.title || '';
                          if (!phone && c.id?._serialized) {
                            const m = String(c.id._serialized).match(/([0-9]{7,15})@(c.us|s.whatsapp.net)/);
                            if (m && m[1]) phone = m[1];
                          }
                          if (!phone && c.contact?.phoneNumber) {
                            phone = String(c.contact.phoneNumber).replace(/\\D/g, '');
                          }
                          if (!phone && c.id?.user) {
                            const u = String(c.id.user).replace(/\\D/g, '');
                            if (u.length >= 7) phone = u;
                          }
                        }
                      }
                      curr = curr.return;
                      d++;
                    }
                    if (phone && chatTitle) break;
                  }
                } catch (fibErr) {}
              }

              // Strategy D: DOM Header Title and Subtitle Extraction
              if (!chatTitle) {
                const headerTitleEl = document.querySelector('#main header span[data-testid="conversation-info-header-chat-title"], #main header span[title], header span[title], header div[role="button"] span[title]');
                chatTitle = headerTitleEl ? (headerTitleEl.getAttribute('title') || headerTitleEl.innerText || '').trim() : '';
              }

              if (!phone) {
                const subtitleEl = document.querySelector('#main header span[title*="+"], header span[title*="+"], #main header div[data-testid="chat-subtitle"]');
                if (subtitleEl) {
                  const subDigits = String(subtitleEl.getAttribute('title') || subtitleEl.innerText || '').replace(/\\D/g, '');
                  if (subDigits.length >= 7) phone = subDigits;
                }
              }

              if (!phone && chatTitle) {
                const titleDigits = chatTitle.replace(/\\D/g, '');
                if (titleDigits.length >= 7) phone = titleDigits;
              }

              // Fallback to active CRM contact phone if this chat is open
              if (!phone && "${d}") {
                phone = "${d}";
              }

              // 2. Extract all visible messages in the active chat container (#main)
              const container = document.querySelector('#main') || document;
              const messageNodes = container.querySelectorAll('div.message-in, div.message-out, div[data-id], div[role="row"]');
              const messages = [];

              if (messageNodes && messageNodes.length > 0) {
                messageNodes.forEach((node, idx) => {
                  try {
                    const dataId = node.getAttribute('data-id') || node.querySelector('*[data-id]')?.getAttribute('data-id') || '';
                    const isOut = node.classList.contains('message-out') || Boolean(node.querySelector('.message-out')) || dataId.startsWith('true_');

                    let text = '';
                    const textSpan = node.querySelector('span.selectable-text, div.copyable-text, span._ao3e, span[dir="ltr"], span[dir="rtl"]');
                    if (textSpan) {
                      text = textSpan.innerText || textSpan.textContent || '';
                    }
                    if (!text) {
                      const clone = node.cloneNode(true);
                      const removeEls = clone.querySelectorAll('span[dir="auto"], svg, button');
                      removeEls.forEach(el => el.remove());
                      text = (clone.innerText || '').trim();
                    }

                    text = (text || '').trim();
                    if (!text) return;

                    let msgId = dataId;
                    let msgPhone = phone;

                    if (dataId) {
                      const m = dataId.match(/([0-9]{7,15})@(c.us|s.whatsapp.net)/);
                      if (m && m[1]) {
                        msgPhone = m[1];
                      }
                    }
                    if (!msgId) {
                      msgId = 'wa_' + (isOut ? 'out' : 'in') + '_' + text.substring(0, 20) + '_' + (node.offsetTop || idx);
                    }

                    let ts = Math.floor(Date.now() / 1000);
                    const copyable = node.querySelector('div.copyable-text[data-pre-plain-text]');
                    if (copyable) {
                      const preText = copyable.getAttribute('data-pre-plain-text') || '';
                      const matchTime = preText.match(/\\[(.*?)\\]/);
                      if (matchTime && matchTime[1]) {
                        const parsedDate = new Date(matchTime[1]);
                        if (!isNaN(parsedDate.getTime())) {
                          ts = Math.floor(parsedDate.getTime() / 1000);
                        }
                      }
                    }

                    messages.push({
                      id: msgId,
                      body: text,
                      sender: chatTitle || msgPhone || "${p}",
                      phone: msgPhone || phone,
                      fromMe: isOut,
                      timestamp: ts
                    });
                  } catch (e) {}
                });
              }

              // 3. Extract all sidebar chats from #pane-side
              const sidebarChats = [];
              try {
                const paneRows = document.querySelectorAll('#pane-side div[role="listitem"], #pane-side div[role="row"], #pane-side div[data-testid="cell-frame-container"]');
                paneRows.forEach(row => {
                  try {
                    let rPhone = '';
                    let rName = '';
                    let rLastMsg = '';
                    let rUnread = 0;

                    const titleEl = row.querySelector('span[title], div[title], .x10flqx, span._ao3e');
                    if (titleEl) {
                      rName = titleEl.getAttribute('title') || titleEl.innerText || '';
                    }

                    const subEl = row.querySelector('span[dir="ltr"], span[dir="auto"], span._ao3e, div._ak8l');
                    if (subEl) {
                      rLastMsg = subEl.innerText || subEl.textContent || '';
                    }

                    const unreadBadge = row.querySelector('span[aria-label*="unread"], span._ak8q, span[data-testid="icon-unread-count"]');
                    if (unreadBadge) {
                      const uCount = parseInt((unreadBadge.innerText || unreadBadge.textContent || '0').replace(/D/g, ''), 10);
                      if (!isNaN(uCount)) rUnread = uCount;
                    }

                    // Extract phone from React fiber or row html
                    const rawHtml = row.outerHTML || '';
                    const m = rawHtml.match(/([0-9]{7,15})@(c.us|s.whatsapp.net)/);
                    if (m && m[1]) rPhone = m[1];

                    if (!rPhone) {
                      const fiberKey = Object.keys(row).find(k => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$'));
                      if (fiberKey) {
                        let curr = row[fiberKey];
                        let d = 0;
                        while (curr && d < 25) {
                          const c = curr.memoizedProps?.chat || curr.memoizedProps?.conversation || curr.memoizedProps?.contact;
                          if (c) {
                            if (c.id?._serialized) {
                              const matchP = String(c.id._serialized).match(/([0-9]{7,15})@(c.us|s.whatsapp.net)/);
                              if (matchP && matchP[1]) rPhone = matchP[1];
                            }
                            if (!rName && (c.name || c.formattedTitle || c.title)) {
                              rName = c.name || c.formattedTitle || c.title;
                            }
                            break;
                          }
                          curr = curr.return;
                          d++;
                        }
                      }
                    }

                    if (!rPhone && rName) {
                      const digits = rName.replace(/D/g, '');
                      if (digits.length >= 7) rPhone = digits;
                    }

                    if (rPhone) {
                      sidebarChats.push({
                        phone: rPhone,
                        name: rName || rPhone,
                        lastMessage: rLastMsg,
                        unreadCount: rUnread
                      });
                    }
                  } catch (e) {}
                });
              } catch (e) {}

              return {
                phone: phone,
                sender: chatTitle || "${p}",
                messages: messages,
                sidebarChats: sidebarChats
              };
            } catch (err) {
              return { error: err.message };
            }
          })()
        `,o=await t.executeJavaScript(a);if(o){const g=typeof window<"u"&&(window.electronAPI||window.location.hostname==="localhost"||window.location.hostname==="127.0.0.1")?"http://localhost:5000/api":"https://api.employeemanagementsystems.com/api",x=localStorage.getItem("token")||localStorage.getItem("omnilflow_token");if(Array.isArray(o.messages)&&o.messages.length>0){if(typeof window<"u")try{window.dispatchEvent(new CustomEvent("omniflow-wa-batch-sync",{detail:o}))}catch{}await fetch(`${g}/messages/inbound-sync`,{method:"POST",headers:{"Content-Type":"application/json",...x?{Authorization:`Bearer ${x}`}:{}},body:JSON.stringify({phone:o.phone,sender:o.sender,messages:o.messages,tenantId:s})})}if(Array.isArray(o.sidebarChats)&&o.sidebarChats.length>0)for(const u of o.sidebarChats)u.phone&&u.lastMessage&&fetch(`${g}/messages/inbound-sync`,{method:"POST",headers:{"Content-Type":"application/json",...x?{Authorization:`Bearer ${x}`}:{}},body:JSON.stringify({phone:u.phone,sender:u.name,body:u.lastMessage,fromMe:!1,tenantId:s})}).catch(()=>{})}}catch{}},r=()=>{n&&clearInterval(n),n=setInterval(i,1500),i()};return t.addEventListener("dom-ready",r),t.addEventListener("did-finish-load",r),n=setInterval(i,1500),()=>{n&&clearInterval(n),t.removeEventListener("dom-ready",r),t.removeEventListener("did-finish-load",r)}},[h,j,s]),(0,c.useEffect)(()=>{if(typeof window<"u"&&window.electronAPI?.onIncomingWhatsAppMessage){const t=window.electronAPI.onIncomingWhatsAppMessage(async n=>{const{sender:i,body:r,phone:d,timestamp:p,fromMe:a}=n||{};if(r)try{const o=typeof window<"u"&&(window.location.hostname==="localhost"||window.location.hostname==="127.0.0.1")?"http://localhost:5000/api":"https://api.employeemanagementsystems.com/api",g=localStorage.getItem("token")||localStorage.getItem("omnilflow_token");await fetch(`${o}/messages/inbound-sync`,{method:"POST",headers:{"Content-Type":"application/json",...g?{Authorization:`Bearer ${g}`}:{}},body:JSON.stringify({sender:i,body:r,phone:d,fromMe:a,timestamp:Math.floor((p||Date.now())/1e3),tenantId:s})})}catch(o){console.warn("[WhatsApp Inbound Sync Error]",o)}});return()=>{typeof t=="function"&&t()}}},[s]),(0,c.useEffect)(()=>{const t=n=>{T.current&&!T.current.contains(n.target)&&(S(!1),y(!1))};return b&&document.addEventListener("mousedown",t),()=>document.removeEventListener("mousedown",t)},[b]);const O=t=>{D(t),localStorage.setItem(`omniflow_selected_staff_id_${s}`,t),localStorage.setItem("omniflow_selected_staff_id",t),C(Date.now()),S(!1),y(!1)},$=t=>{if(t.preventDefault(),!I.trim())return;const n=`staff_${Date.now()}`,i={id:n,name:I.trim(),phone:"Scan QR to connect",status:"idle"},r=[...A,i];N(r),localStorage.setItem(`omniflow_custom_staff_${s}`,JSON.stringify(r)),localStorage.setItem("omniflow_custom_staff_accounts",JSON.stringify(r)),D(n),localStorage.setItem(`omniflow_selected_staff_id_${s}`,n),localStorage.setItem("omniflow_selected_staff_id",n),k(""),y(!1),S(!1),C(Date.now())},q=()=>{if(C(Date.now()),l.current)try{l.current.reloadIgnoringCache?l.current.reloadIgnoringCache():l.current.src&&(l.current.src=l.current.src)}catch{}},W=m?.id&&_[m.id]||0,v=Object.values(_).reduce((t,n)=>t+(typeof n=="number"?n:0),0);return(0,e.jsxs)("div",{style:{display:"flex",flexDirection:"column",height:"calc(100vh - 52px)",width:"100%",backgroundColor:"#0b141a",overflow:"hidden",position:"relative"},children:[(0,e.jsxs)("div",{style:{background:"linear-gradient(90deg, #052e16 0%, #064e3b 100%)",borderBottom:"1px solid #059669",padding:"6px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0,zIndex:40},children:[(0,e.jsxs)("div",{style:{display:"flex",alignItems:"center",gap:"8px",color:"#ecfdf5",fontSize:"12px",fontWeight:"600"},children:[(0,e.jsx)(Q,{size:15,style:{color:"#34d399",flexShrink:0}}),(0,e.jsxs)("span",{children:["🚀 ",(0,e.jsx)("strong",{children:"WhatsApp Desktop Companion App:"})," Install on your Windows PC for 24/7 background sync & multi-session multi-staff live chat."]})]}),(0,e.jsxs)("div",{style:{display:"flex",alignItems:"center",gap:"8px"},children:[(0,e.jsx)("a",{href:"/OmniFlow-CRM-Setup.exe",download:"OmniFlow-CRM-Setup.exe",style:{display:"inline-flex",alignItems:"center",gap:"6px",padding:"4px 12px",borderRadius:"6px",background:"#10b981",color:"#ffffff",fontSize:"11.5px",fontWeight:"800",textDecoration:"none",boxShadow:"0 2px 8px rgba(16, 185, 129, 0.4)",cursor:"pointer"},children:(0,e.jsx)("span",{children:"📥 Download Desktop App (.exe)"})}),(0,e.jsx)("a",{href:"/OmniFlow-CRM-Setup.exe",download:"OmniFlow-WhatsApp-Desktop-Suite.zip",style:{display:"inline-flex",alignItems:"center",gap:"4px",padding:"4px 8px",borderRadius:"6px",background:"rgba(255, 255, 255, 0.12)",color:"#a7f3d0",border:"1px solid rgba(255, 255, 255, 0.2)",fontSize:"11px",fontWeight:"700",textDecoration:"none",cursor:"pointer"},title:"Download portable zip package",children:(0,e.jsx)("span",{children:"Portable .zip"})})]})]}),(0,e.jsxs)("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",background:"#111b21",borderBottom:"1px solid rgba(255, 255, 255, 0.08)",padding:"5px 14px",height:"38px",flexShrink:0,zIndex:50},children:[(0,e.jsxs)("div",{style:{position:"relative"},ref:T,children:[(0,e.jsxs)("button",{type:"button",onClick:()=>{S(t=>!t),y(!1)},style:{display:"flex",alignItems:"center",gap:"8px",padding:"4px 10px",borderRadius:"7px",background:b?"rgba(20, 210, 203, 0.2)":"rgba(255, 255, 255, 0.06)",border:b?"1px solid #14d2cb":"1px solid rgba(255, 255, 255, 0.12)",color:"#ffffff",fontSize:"12px",fontWeight:"700",cursor:"pointer",transition:"all 0.15s ease"},children:[(0,e.jsx)(V,{size:14,style:{color:"#14d2cb"}}),(0,e.jsx)("span",{style:{width:"7px",height:"7px",borderRadius:"50%",background:m?m.status==="connected"?"#10b981":"#f59e0b":"#94a3b8",boxShadow:m?.status==="connected"?"0 0 6px #10b981":"none"}}),(0,e.jsx)("span",{style:{maxWidth:"140px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"},children:m?m.name:"WhatsApp Accounts"}),W>0&&(0,e.jsx)("span",{style:{background:"#22c55e",color:"#052e16",fontSize:"10.5px",fontWeight:"900",padding:"1px 6px",borderRadius:"10px",boxShadow:"0 0 8px rgba(34, 197, 94, 0.6)"},children:W}),(0,e.jsx)(K,{size:13,style:{color:"#14d2cb",transform:b?"rotate(180deg)":"none",transition:"transform 0.2s ease"}})]}),b&&(0,e.jsxs)("div",{style:{position:"absolute",top:"calc(100% + 6px)",left:0,width:"280px",background:"#182229",borderRadius:"10px",border:"1px solid rgba(20, 210, 203, 0.3)",boxShadow:"0 12px 35px rgba(0, 0, 0, 0.75)",padding:"6px",zIndex:999999,display:"flex",flexDirection:"column",gap:"4px"},children:[(0,e.jsxs)("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"6px 10px 4px 10px",borderBottom:"1px solid rgba(255, 255, 255, 0.06)"},children:[(0,e.jsxs)("span",{style:{fontSize:"10.5px",fontWeight:"800",color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.5px"},children:["Staff Accounts (",w.length,")"]}),v>0&&(0,e.jsxs)("span",{style:{fontSize:"10px",color:"#22c55e",fontWeight:"700"},children:[v," total unread"]})]}),(0,e.jsx)("div",{style:{maxHeight:"240px",overflowY:"auto",display:"flex",flexDirection:"column",gap:"2px"},children:w.length===0?(0,e.jsx)("div",{style:{padding:"12px 10px",fontSize:"11px",color:"#94a3b8",textAlign:"center"},children:"No WhatsApp accounts connected yet. Click below to add an account."}):w.map(t=>{const n=t.id===h,i=_[t.id]||0;return(0,e.jsxs)("div",{onClick:()=>O(t.id),style:{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 10px",borderRadius:"6px",background:n?"rgba(20, 210, 203, 0.15)":"transparent",border:n?"1px solid rgba(20, 210, 203, 0.3)":"1px solid transparent",cursor:"pointer",transition:"background 0.12s ease"},onMouseOver:r=>{n||(r.currentTarget.style.background="rgba(255,255,255,0.05)")},onMouseOut:r=>{n||(r.currentTarget.style.background="transparent")},children:[(0,e.jsxs)("div",{style:{display:"flex",alignItems:"center",gap:"8px",minWidth:0},children:[(0,e.jsx)("span",{style:{width:"8px",height:"8px",borderRadius:"50%",background:t.status==="connected"?"#10b981":"#f59e0b",flexShrink:0}}),(0,e.jsxs)("div",{style:{minWidth:0},children:[(0,e.jsx)("div",{style:{fontSize:"12px",fontWeight:n?"700":"600",color:n?"#14d2cb":"#ffffff",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"},children:t.name}),t.phone&&(0,e.jsx)("div",{style:{fontSize:"10px",color:"#94a3b8"},children:t.phone})]})]}),(0,e.jsxs)("div",{style:{display:"flex",alignItems:"center",gap:"6px",flexShrink:0},children:[i>0?(0,e.jsxs)("span",{style:{background:"#22c55e",color:"#052e16",fontSize:"10px",fontWeight:"900",padding:"2px 7px",borderRadius:"10px",boxShadow:"0 0 6px rgba(34, 197, 94, 0.5)"},children:[i," new"]}):(0,e.jsx)("span",{style:{fontSize:"9.5px",color:"#64748b"},children:"0 new"}),n&&(0,e.jsx)(F,{size:14,style:{color:"#14d2cb"}})]})]},t.id)})}),(0,e.jsx)("div",{style:{borderTop:"1px solid rgba(255, 255, 255, 0.08)",paddingTop:"6px",marginTop:"2px"},children:M?(0,e.jsxs)("form",{onSubmit:$,style:{display:"flex",flexDirection:"column",gap:"6px",padding:"2px 4px"},children:[(0,e.jsx)("input",{type:"text",placeholder:"Staff Name (e.g. Rahul Sales)",value:I,onChange:t=>k(t.target.value),autoFocus:!0,style:{padding:"6px 8px",borderRadius:"5px",background:"#111b21",border:"1px solid #14d2cb",color:"#ffffff",fontSize:"11.5px",outline:"none"}}),(0,e.jsxs)("div",{style:{display:"flex",gap:"6px"},children:[(0,e.jsx)("button",{type:"submit",style:{flex:1,padding:"5px",borderRadius:"5px",background:"#0d9488",border:"none",color:"#ffffff",fontSize:"11px",fontWeight:"700",cursor:"pointer"},children:"Add & Link QR"}),(0,e.jsx)("button",{type:"button",onClick:()=>{y(!1),k("")},style:{padding:"5px 8px",borderRadius:"5px",background:"rgba(255,255,255,0.08)",border:"none",color:"#94a3b8",fontSize:"11px",cursor:"pointer"},children:"Cancel"})]})]}):(0,e.jsxs)("button",{type:"button",onClick:()=>y(!0),style:{display:"flex",alignItems:"center",justifyContent:"center",gap:"6px",width:"100%",padding:"7px",borderRadius:"6px",background:"rgba(20, 210, 203, 0.1)",border:"1px dashed rgba(20, 210, 203, 0.4)",color:"#14d2cb",fontSize:"11.5px",fontWeight:"700",cursor:"pointer"},children:[(0,e.jsx)(Y,{size:13})," Add New Staff Account"]})})]})]}),(0,e.jsxs)("div",{style:{display:"flex",alignItems:"center",gap:"10px"},children:[v>0&&(0,e.jsxs)("div",{style:{display:"flex",alignItems:"center",gap:"5px",background:"rgba(34, 197, 94, 0.12)",border:"1px solid rgba(34, 197, 94, 0.25)",padding:"3px 8px",borderRadius:"6px",color:"#22c55e",fontSize:"11px",fontWeight:"700"},children:[(0,e.jsx)(J,{size:12}),(0,e.jsxs)("span",{children:[v," Pending Chats"]})]}),(0,e.jsxs)("button",{type:"button",onClick:()=>B({phone:f?.phone||"",name:f?.name||"Customer"}),title:"Call Customer via Mobile SIM Bridge",style:{display:"flex",alignItems:"center",gap:"5px",padding:"4px 10px",borderRadius:"6px",background:"linear-gradient(135deg, #10b981 0%, #0d9488 100%)",border:"none",color:"#ffffff",fontSize:"11px",fontWeight:"700",cursor:"pointer",boxShadow:"0 2px 10px rgba(16, 185, 129, 0.35)"},children:[(0,e.jsx)(G,{size:12}),(0,e.jsx)("span",{children:"Call via SIM"})]}),(0,e.jsxs)("button",{type:"button",onClick:q,title:"Reload WhatsApp Web Session",style:{display:"flex",alignItems:"center",gap:"4px",padding:"4px 8px",borderRadius:"6px",background:"rgba(255, 255, 255, 0.05)",border:"1px solid rgba(255, 255, 255, 0.1)",color:"#94a3b8",fontSize:"11px",cursor:"pointer"},children:[(0,e.jsx)(Z,{size:12}),(0,e.jsx)("span",{children:"Reload"})]})]})]}),(0,e.jsx)("div",{style:{flex:1,height:"100%",position:"relative",backgroundColor:"#111b21",display:"flex",alignItems:"center",justifyContent:"center"},children:typeof window<"u"&&window.electronAPI?.isDesktopApp?(0,e.jsx)("webview",{ref:l,src:"https://web.whatsapp.com",partition:`persist:staff_${h||"primary"}`,useragent:"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",style:{width:"100%",height:"100%",border:"none",display:"inline-flex"},allowpopups:"true"},`wa_${h||"primary"}_${j}`):(0,e.jsxs)("div",{style:{maxWidth:"580px",width:"90%",padding:"36px",background:"#0b141a",borderRadius:"18px",border:"1px solid rgba(255,255,255,0.08)",textAlign:"center",color:"white",boxShadow:"0 20px 40px rgba(0,0,0,0.5)"},children:[(0,e.jsx)("div",{style:{width:"64px",height:"64px",borderRadius:"50%",background:"rgba(37, 211, 102, 0.15)",color:"#25d366",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 20px"},children:(0,e.jsx)("svg",{width:"34",height:"34",viewBox:"0 0 24 24",fill:"currentColor",children:(0,e.jsx)("path",{d:"M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2zm5.78 14.07c-.24.68-1.39 1.3-1.92 1.38-.51.08-1.17.11-3.37-.8-2.65-1.09-4.35-3.8-4.48-3.98-.13-.18-1.08-1.44-1.08-2.75 0-1.31.69-1.95.93-2.22.24-.27.53-.34.71-.34.18 0 .36 0 .51.01.16.01.38-.06.59.45.22.53.75 1.83.82 1.96.07.13.11.29.02.47-.09.18-.13.29-.27.45-.13.16-.29.36-.41.48-.13.13-.27.27-.12.53.16.27.69 1.14 1.48 1.84 1.02.91 1.88 1.19 2.15 1.32.27.13.42.11.58-.07.16-.18.67-.78.85-1.05.18-.27.36-.22.59-.13.24.09 1.5.71 1.76.84.27.13.44.2.51.31.07.11.07.64-.17 1.32z"})})}),(0,e.jsx)("h2",{style:{fontSize:"20px",fontWeight:"800",margin:"0 0 10px 0",color:"#ffffff"},children:"Real WhatsApp Web & Multi-Staff Workspace"}),(0,e.jsx)("p",{style:{color:"#94a3b8",fontSize:"13px",lineHeight:"1.6",margin:"0 0 24px 0"},children:"Zero server load • Real-time WhatsApp sync • Multi-staff account live management"}),(0,e.jsxs)("div",{style:{display:"flex",flexDirection:"column",gap:"12px"},children:[(0,e.jsx)("button",{type:"button",onClick:()=>window.open("https://web.whatsapp.com","_blank"),style:{width:"100%",padding:"14px 20px",borderRadius:"10px",border:"none",background:"linear-gradient(135deg, #25d366 0%, #128c7e 100%)",color:"white",fontWeight:"800",fontSize:"14px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:"8px",boxShadow:"0 6px 20px rgba(37, 211, 102, 0.35)"},children:(0,e.jsx)("span",{children:"🚀 Launch WhatsApp Web in New Window"})}),(0,e.jsxs)("div",{style:{padding:"12px",background:"rgba(255,255,255,0.04)",borderRadius:"10px",fontSize:"12px",color:"#64748b",textAlign:"left",lineHeight:"1.5"},children:[(0,e.jsx)("strong",{style:{color:"#14d2cb"},children:"💡 Pro Tip:"})," For fully embedded in-app WhatsApp viewing with native voice & video calling, run the ",(0,e.jsx)("strong",{children:"OmniFlow Desktop App"})," on your PC!"]})]})]})})]})}export{fe as default};
