import { validateIPLicense } from '@/lib/netflix/validation';

describe('IP License Validation', () => {
  it('should accept commercial IP license', () => {
    const license = {
      id: 'ip_001',
      license_type: '商用利用可',
      is_active: true
    };

    const result = validateIPLicense(license);

    expect(result.isValid).toBe(true);
    expect(result.canUseForNetflix).toBe(true);
  });

  it('should reject non-commercial IP license', () => {
    const license = {
      id: 'ip_002',
      license_type: '非商用のみ',
      is_active: true
    };

    const result = validateIPLicense(license);

    expect(result.isValid).toBe(true);
    expect(result.canUseForNetflix).toBe(false);
    expect(result.reason).toBe('commercial_license_required');
  });

  it('should reject inactive IP license', () => {
    const license = {
      id: 'ip_003',
      license_type: '商用利用可',
      is_active: false
    };

    const result = validateIPLicense(license);

    expect(result.isValid).toBe(false);
    expect(result.reason).toBe('license_inactive');
  });
});
