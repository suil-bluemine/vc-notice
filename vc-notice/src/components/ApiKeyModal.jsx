import React, { useState } from 'react'

export default function ApiKeyModal({ onSave, defaultKey = '' }) {
  const [key, setKey] = useState(defaultKey)
  const [show, setShow] = useState(false)

  const handleSave = () => {
    if (key.trim()) onSave(key.trim())
    setShow(false)
  }

  return (
    <>
      <button
        onClick={() => setShow(true)}
        style={{
          background: 'var(--bg3)',
          border: '1px solid var(--line2)',
          color: 'var(--text2)',
          borderRadius: 'var(--r)',
          padding: '5px 12px',
          fontSize: 12,
          cursor: 'pointer',
          fontFamily: 'var(--sans)',
        }}
      >
        {defaultKey ? '🔑 API 키 변경' : '🔑 API 키 설정'}
      </button>

      {show && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 999,
        }} onClick={() => setShow(false)}>
          <div style={{
            background: 'var(--bg2)',
            border: '1px solid var(--line2)',
            borderRadius: 'var(--r2)',
            padding: '2rem',
            width: 460,
            maxWidth: '90vw',
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>Anthropic API 키 설정</h3>
            <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: '1.5rem', lineHeight: 1.7 }}>
              공고 수집을 위해 Anthropic API 키가 필요합니다.<br />
              키는 브라우저 localStorage에만 저장되며 외부로 전송되지 않습니다.
            </p>
            <input
              type="password"
              value={key}
              onChange={e => setKey(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              placeholder="sk-ant-..."
              style={{
                width: '100%',
                background: 'var(--bg3)',
                border: '1px solid var(--line2)',
                borderRadius: 'var(--r)',
                padding: '10px 14px',
                color: 'var(--text)',
                fontSize: 13,
                fontFamily: 'var(--mono)',
                marginBottom: '1rem',
              }}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShow(false)}
                style={{
                  background: 'var(--bg3)', border: '1px solid var(--line)',
                  color: 'var(--text2)', borderRadius: 'var(--r)',
                  padding: '8px 16px', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--sans)',
                }}
              >취소</button>
              <button
                onClick={handleSave}
                disabled={!key.trim()}
                style={{
                  background: key.trim() ? 'linear-gradient(135deg, #00d4aa, #0099ff)' : 'var(--bg4)',
                  border: 'none', color: key.trim() ? '#000' : 'var(--text3)',
                  borderRadius: 'var(--r)', padding: '8px 20px',
                  fontSize: 13, fontWeight: 500, cursor: key.trim() ? 'pointer' : 'not-allowed',
                  fontFamily: 'var(--sans)',
                }}
              >저장</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
