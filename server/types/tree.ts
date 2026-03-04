export type LocalGender = "male" | "female";
export type LocalRelationshipType = "parent" | "spouse";

export interface LocalPerson {
  id: string;
  name: string;
  gender: LocalGender;
  birthYear: number | null;
  nickname: string | null;
  phone: string | null;
  address: string | null;
  isDeceased: boolean;
  createdAt: number;
}

export interface LocalRelationship {
  id: string;
  type: LocalRelationshipType;
  person1Id: string;
  person2Id: string;
  orderIndex: number;
}

export interface LocalDatabasePayload {
  persons: LocalPerson[];
  relationships: LocalRelationship[];
}
