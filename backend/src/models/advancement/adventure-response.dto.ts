export interface AdventureResponseDto {
  id: string;
  rankId: string;
  rankLevel?: string;
  name: string;
  description?: string;
  classification: 'REQUIRED' | 'ELECTIVE' | 'SPECIAL_ELECTIVE';
  displayOrder: number;
}
