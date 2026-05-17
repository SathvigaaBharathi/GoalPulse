import React from 'react'
import { X, ShieldAlert } from 'lucide-react'

export default function MockLoginOverlay({ accounts, onSelect, onClose }) {
  const handleAccountClick = (account) => {
    onSelect(account)
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white w-full max-w-[440px] rounded-2xl shadow-2xl border border-slate-100 overflow-hidden relative p-8 md:p-10 transform scale-100 transition-transform">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition-colors"
          title="Close SSO Sign In"
        >
          <X size={20} />
        </button>

        {/* Brand / Logo Header */}
        <div className="flex items-center gap-2.5 mb-8">
          <div className="grid grid-cols-2 gap-0.5 w-6 h-6 shrink-0">
            <div className="bg-[#f25022] w-2.5 h-2.5 rounded-sm"></div>
            <div className="bg-[#7fba00] w-2.5 h-2.5 rounded-sm"></div>
            <div className="bg-[#00a4ef] w-2.5 h-2.5 rounded-sm"></div>
            <div className="bg-[#ffb900] w-2.5 h-2.5 rounded-sm"></div>
          </div>
          <span className="font-extrabold text-slate-800 tracking-tight text-lg">GoalPulse SSO</span>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-slate-900 mb-1 tracking-tight">Sign in</h2>
        <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 px-2.5 py-1.5 rounded-lg font-medium mb-6">
          <ShieldAlert size={14} className="shrink-0" />
          <span>Demo Mode — Select your Active Directory account</span>
        </div>

        {/* Accounts List */}
        <div className="space-y-3 mb-6">
          {accounts.length === 0 ? (
            <div className="py-6 text-center text-slate-400 text-sm">
              Loading available directory accounts...
            </div>
          ) : (
            accounts.map((acc) => {
              const roleName = acc.idTokenClaims?.roles?.[0] || 'Employee'
              const jobTitle = acc.idTokenClaims?.jobTitle || 'Contributor'
              
              return (
                <button
                  key={acc.localAccountId}
                  onClick={() => handleAccountClick(acc)}
                  className="w-full text-left p-4 rounded-xl border border-slate-200 hover:border-accent bg-white hover:bg-slate-50/50 hover:shadow-md hover:shadow-slate-100 transition-all flex items-center gap-4 group cursor-pointer relative overflow-hidden"
                >
                  {/* Hover Left Highlight */}
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent transform -translate-x-full group-hover:translate-x-0 transition-transform"></div>
                  
                  {/* Avatar Icon */}
                  <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-bold group-hover:bg-accent/10 group-hover:text-accent transition-colors shrink-0">
                    👤
                  </div>
                  
                  {/* Account Text */}
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-slate-800 text-sm group-hover:text-accent transition-colors truncate">
                      {acc.name}
                    </div>
                    <div className="text-xs text-slate-500 truncate">
                      {acc.username}
                    </div>
                  </div>

                  {/* Badge */}
                  <div className="text-[10px] font-black uppercase tracking-tight bg-slate-100 text-slate-600 px-2 py-0.5 rounded group-hover:bg-accent/25 group-hover:text-accent transition-all shrink-0">
                    {roleName}
                  </div>
                </button>
              )
            })
          )}
        </div>

        {/* Divider */}
        <div className="relative flex py-2 items-center mb-6">
          <div className="flex-grow border-t border-slate-200"></div>
          <span className="flex-shrink mx-4 text-slate-400 text-xs font-semibold uppercase tracking-wider">
            or continue with email
          </span>
          <div className="flex-grow border-t border-slate-200"></div>
        </div>

        {/* Fallback Instruction */}
        <p className="text-slate-500 text-xs text-center leading-normal">
          Click the <strong className="text-slate-700">Close (✕)</strong> button above to use the credential-basedWork Email sign-in form.
        </p>

      </div>
    </div>
  )
}
