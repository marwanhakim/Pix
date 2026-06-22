const fs = require('fs');
const filePath = '/src/components/CustomerManager.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Find the corrupted section
const targetStr = `                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">`;
const indexOfTarget = content.indexOf(targetStr);

if (indexOfTarget === -1) {
    console.error("Target string not found!");
    process.exit(1);
}

// We want to replace from 'targetStr' down to the 'Customers database Table Grid' line.
// Let's find the 'Customers database Table Grid' comment.
const commentStr = `          {/* Customers database Table Grid */}`;
const indexOfComment = content.indexOf(commentStr);

if (indexOfComment === -1) {
    console.error("Comment string not found!");
    process.exit(1);
}

const replacement = `                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                          <span>⏱️ لعب:</span>
                          <span className={\`font-black \${idx === 0 ? 'text-yellow-405' : 'text-slate-300'}\`}>
                            {hours.toFixed(1)} ساعة
                          </span>
                        </div>
                        {idx === 0 && (
                          <div className={\`text-[9px] text-yellow-600/80 font-semibold leading-none pt-0.5 animate-pulse\`}>
                            🔥 متصدر الصالة الحالي
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Customers database Table Grid */}`;

const before = content.substring(0, indexOfTarget);
const after = content.substring(indexOfComment + commentStr.length);

fs.writeFileSync(filePath, before + replacement + after, 'utf8');
console.log("Successfully fixed CustomerManager.tsx!");
