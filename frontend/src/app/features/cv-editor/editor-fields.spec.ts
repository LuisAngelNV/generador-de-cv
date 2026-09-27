import {
  buildItemForm,
  fromMonthInput,
  SECTION_CONFIGS,
  SectionConfig,
  toFormValues,
  toItemPayload,
  toMonthInput,
} from './editor-fields';

const experiences = SECTION_CONFIGS.find((c) => c.key === 'experiences') as SectionConfig;

describe('editor fields', () => {
  it('converts between API dates and month inputs', () => {
    expect(toMonthInput('2021-03-01T00:00:00.000Z')).toBe('2021-03');
    expect(toMonthInput(null)).toBe('');
    expect(fromMonthInput('2021-03')).toBe('2021-03-01');
    expect(fromMonthInput('')).toBeNull();
  });

  it('turns an API item into form values and back into a payload', () => {
    const values = toFormValues(experiences, {
      position: 'Dev',
      company: 'ACME',
      location: null,
      startDate: '2021-03-01T00:00:00.000Z',
      endDate: null,
      isCurrent: true,
      description: null,
    });

    expect(values).toEqual({
      position: 'Dev',
      company: 'ACME',
      location: '',
      startDate: '2021-03',
      endDate: '',
      isCurrent: true,
      description: '',
    });
    expect(toItemPayload(experiences, { ...values, location: '  Madrid ' })).toEqual({
      position: 'Dev',
      company: 'ACME',
      location: 'Madrid',
      startDate: '2021-03-01',
      endDate: null,
      isCurrent: true,
      description: null,
    });
  });

  it('builds forms that validate required fields and the date range', () => {
    const form = buildItemForm(experiences, toFormValues(experiences, null));
    expect(form.valid).toBe(false);

    form.patchValue({ position: 'Dev', company: 'ACME', startDate: '2022-01', endDate: '2021-01' });
    expect(form.hasError('dateRange')).toBe(true);

    form.patchValue({ endDate: '2023-01' });
    expect(form.valid).toBe(true);
  });

  it('only accepts http(s) links', () => {
    const projects = SECTION_CONFIGS.find((c) => c.key === 'projects') as SectionConfig;
    const form = buildItemForm(projects, toFormValues(projects, { name: 'CV' }));

    form.patchValue({ url: 'javascript:alert(1)' });
    expect(form.controls['url']!.valid).toBe(false);

    form.patchValue({ url: 'https://example.com' });
    expect(form.valid).toBe(true);
  });
});
