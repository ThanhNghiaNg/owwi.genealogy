'use client'

import { useState, useEffect, useRef } from 'react'
import type { Person } from '@/lib/family-tree/database'

interface PersonFormProps {
  person: Person | null
  mode: 'create' | 'edit'
  onSubmit: (personId: string, updates: Partial<Omit<Person, 'id' | 'createdAt'>>) => void
  onClose: () => void
}

export function PersonForm({ person, mode, onSubmit, onClose }: PersonFormProps) {
  const [name, setName] = useState(person?.name ?? '')
  const [gender, setGender] = useState<'male' | 'female'>(person?.gender ?? 'male')
  const [birthYear, setBirthYear] = useState(
    person?.birthYear != null ? String(person.birthYear) : ''
  )
  const [nickname, setNickname] = useState(person?.nickname ?? '')
  const [phone, setPhone] = useState(person?.phone ?? '')
  const [address, setAddress] = useState(person?.address ?? '')
  const [isDeceased, setIsDeceased] = useState(person?.isDeceased ?? false)

  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    nameRef.current?.focus()
  }, [])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!person) return
    const parsedBirthYear = birthYear.trim() ? parseInt(birthYear.trim(), 10) : null
    onSubmit(person.id, {
      name: name.trim() || person.name,
      gender,
      birthYear: parsedBirthYear !== null && !isNaN(parsedBirthYear) ? parsedBirthYear : null,
      nickname: nickname.trim() || null,
      phone: phone.trim() || null,
      address: address.trim() || null,
      isDeceased,
    })
  }

  const title = mode === 'edit' ? 'Chỉnh sửa thông tin' : 'Chi tiết'

  return (
    <div className="family-tree-dialog-overlay" onClick={onClose}>
      <div
        className="family-tree-dialog person-form-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={title}
      >
        <h3 className="family-tree-dialog-title">{title}</h3>
        <form onSubmit={handleSubmit}>
          <div className="family-tree-dialog-field">
            <label htmlFor="pf-name">Tên</label>
            <input
              ref={nameRef}
              id="pf-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nhập tên..."
              autoComplete="off"
            />
          </div>

          <div className="family-tree-dialog-field">
            <label>
              Giới tính <span className="field-required">*</span>
            </label>
            <div className="family-tree-dialog-gender">
              <button
                type="button"
                className={`gender-btn male ${gender === 'male' ? 'active' : ''}`}
                onClick={() => setGender('male')}
              >
                Nam
              </button>
              <button
                type="button"
                className={`gender-btn female ${gender === 'female' ? 'active' : ''}`}
                onClick={() => setGender('female')}
              >
                Nữ
              </button>
            </div>
          </div>

          <div className="person-form-row">
            <div className="family-tree-dialog-field">
              <label htmlFor="pf-birthyear">Năm sinh</label>
              <input
                id="pf-birthyear"
                type="number"
                value={birthYear}
                onChange={(e) => setBirthYear(e.target.value)}
                placeholder="1985"
                autoComplete="off"
              />
            </div>
            <div className="family-tree-dialog-field">
              <label htmlFor="pf-nickname">Biệt danh</label>
              <input
                id="pf-nickname"
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Bác Hai Lan"
                autoComplete="off"
              />
            </div>
          </div>

          <div className="family-tree-dialog-field">
            <label htmlFor="pf-phone">Điện thoại</label>
            <input
              id="pf-phone"
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder=""
              autoComplete="off"
            />
          </div>

          <div className="family-tree-dialog-field">
            <label htmlFor="pf-address">Địa chỉ</label>
            <input
              id="pf-address"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder=""
              autoComplete="off"
            />
          </div>

          <div className="family-tree-dialog-field person-form-checkbox-field">
            <label className="person-form-checkbox-label flex">
              <input
                type="checkbox"
                checked={isDeceased}
                onChange={(e) => setIsDeceased(e.target.checked)}
              />
              <span>Đã mất</span>
            </label>
          </div>

          <div className="family-tree-dialog-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Hủy
            </button>
            <button type="submit" className="btn-confirm">
              Lưu
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
