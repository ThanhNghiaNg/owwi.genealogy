import { NextRequest, NextResponse } from 'next/server'
import * as treeService from '../services/tree.service'

export async function handleGetTree(_req: NextRequest, userId: string): Promise<NextResponse> {
  try {
    const database = await treeService.getTree(userId)
    return NextResponse.json(database)
  } catch (err) {
    console.error('[TREE] getTree error:', err)
    return NextResponse.json({ error: 'Không thể tải dữ liệu phả hệ.' }, { status: 500 })
  }
}

export async function handleCreatePerson(req: NextRequest, userId: string): Promise<NextResponse> {
  let body: treeService.CreatePersonInput
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 }) }

  if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
    return NextResponse.json({ error: 'Tên là bắt buộc.' }, { status: 400 })
  }
  if (body.gender !== 'male' && body.gender !== 'female') {
    return NextResponse.json({ error: 'Giới tính không hợp lệ.' }, { status: 400 })
  }
  if (!body.localId || typeof body.localId !== 'string') {
    return NextResponse.json({ error: 'localId là bắt buộc.' }, { status: 400 })
  }

  try {
    const person = await treeService.createPerson(userId, body)
    return NextResponse.json(person, { status: 201 })
  } catch (err) {
    console.error('[TREE] createPerson error:', err)
    return NextResponse.json({ error: 'Không thể tạo thành viên.' }, { status: 500 })
  }
}

export async function handleUpdatePerson(
  req: NextRequest,
  userId: string,
  personId: string
): Promise<NextResponse> {
  let body: treeService.UpdatePersonInput
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 }) }

  if (body.gender !== undefined && body.gender !== 'male' && body.gender !== 'female') {
    return NextResponse.json({ error: 'Giới tính không hợp lệ.' }, { status: 400 })
  }

  try {
    const person = await treeService.updatePerson(userId, personId, body)
    return NextResponse.json(person)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Không thể cập nhật thành viên.'
    return NextResponse.json({ error: message }, { status: message.includes('not found') ? 404 : 500 })
  }
}

export async function handleDeletePerson(
  _req: NextRequest,
  userId: string,
  personId: string
): Promise<NextResponse> {
  try {
    await treeService.deletePerson(userId, personId)
    return NextResponse.json({ message: 'Đã xóa thành viên.' })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Không thể xóa thành viên.'
    return NextResponse.json({ error: message }, { status: message.includes('not found') ? 404 : 500 })
  }
}

export async function handleCreateRelationship(req: NextRequest, userId: string): Promise<NextResponse> {
  let body: treeService.CreateRelationshipInput
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 }) }

  if (body.type !== 'parent' && body.type !== 'spouse') {
    return NextResponse.json({ error: 'Loại quan hệ không hợp lệ.' }, { status: 400 })
  }
  if (!body.person1Id || !body.person2Id) {
    return NextResponse.json({ error: 'Thiếu thông tin người liên kết.' }, { status: 400 })
  }
  if (!body.localId) {
    return NextResponse.json({ error: 'localId là bắt buộc.' }, { status: 400 })
  }

  try {
    const rel = await treeService.createRelationship(userId, body)
    return NextResponse.json(rel, { status: 201 })
  } catch (err) {
    console.error('[TREE] createRelationship error:', err)
    return NextResponse.json({ error: 'Không thể tạo quan hệ.' }, { status: 500 })
  }
}

export async function handleDeleteRelationship(
  _req: NextRequest,
  userId: string,
  relationshipId: string
): Promise<NextResponse> {
  try {
    await treeService.deleteRelationship(userId, relationshipId)
    return NextResponse.json({ message: 'Đã xóa quan hệ.' })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Không thể xóa quan hệ.'
    return NextResponse.json({ error: message }, { status: message.includes('not found') ? 404 : 500 })
  }
}
