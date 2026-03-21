import { Injectable } from '@nestjs/common';
import { SupabaseService } from 'src/supabase/supabase.service';

type MaybeRelation<T> = T | T[] | null;

const getRelationName = (
  relation: MaybeRelation<{ nama: string }>,
  fallback = '-',
): string => {
  if (!relation) return fallback;
  if (Array.isArray(relation)) return relation[0]?.nama ?? fallback;
  return relation.nama ?? fallback;
};

@Injectable()
export class AdminDashboardService {
  constructor(private supabaseService: SupabaseService) { }

  async getDashboardData() {
    // Execute all queries in parallel for better performance
    const [stats, complianceChart, leaderboard, recentActivities] =
      await Promise.all([
        this.getStats(),
        this.getComplianceChart(),
        this.getLeaderboard(),
        this.getRecentActivities(),
      ]);

    return {
      success: true,
      data: {
        stats,
        complianceChart,
        leaderboard,
        recentActivities,
      },
    };
  }

  // ==========================================
  // 1. STATS CARDS (4 CARDS)
  // ==========================================
  private async getStats() {
    const supabase = this.supabaseService.getClient();

    // Use RPC or efficient count queries where possible
    const [
      { count: totalSiswa },
      { count: totalSiswaAktif },
      { count: totalGuru },
      { count: totalGuruAktif },
      { count: totalKelas },
      { count: totalVoucher },
      { count: voucherDiklaim },
      { data: totalCoinsData },
    ] = await Promise.all([
      // Total Siswa
      supabase.from('siswa').select('*', { count: 'exact', head: true }),
      // Siswa Aktif
      supabase
        .from('siswa')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true),
      // Total Guru
      supabase.from('guru').select('*', { count: 'exact', head: true }),
      // Guru Aktif
      supabase
        .from('guru')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true),
      // Total Kelas
      supabase.from('kelas').select('*', { count: 'exact', head: true }),
      // Total Voucher
      supabase.from('voucher').select('*', { count: 'exact', head: true }),
      // Voucher Diklaim
      supabase
        .from('voucher')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'used'),
      // Total Coins - using sum instead of fetching all rows
      supabase.rpc('get_total_siswa_coins'),
    ]);

    // Fallback if RPC fails, we'll try to get it the old way but it might be slow
    let totalCoins = 0;
    if (totalCoinsData !== null && totalCoinsData !== undefined) {
      totalCoins = Number(totalCoinsData);
    } else {
       const { data: coinsData } = await supabase.from('siswa').select('coins');
       totalCoins = coinsData?.reduce((sum, s) => sum + (s.coins || 0), 0) || 0;
    }

    return {
      totalSiswa: totalSiswa || 0,
      totalSiswaAktif: totalSiswaAktif || 0,
      totalGuru: totalGuru || 0,
      totalGuruAktif: totalGuruAktif || 0,
       totalCoins: totalCoins,
      totalKelas: totalKelas || 0,
      totalVoucher: totalVoucher || 0,
      voucherDiklaim: voucherDiklaim || 0,
    };
  }

  // ==========================================
  // 2. COMPLIANCE CHART (7 HARI TERAKHIR)
  // ==========================================
  private async getComplianceChart() {
    const supabase = this.supabaseService.getClient();

    // Get total siswa aktif (untuk pembagi persentase)
    const { count: totalSiswaAktif } = await supabase
      .from('siswa')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);
    const totalSiswaAktifCount = totalSiswaAktif ?? 0;

    const dateKeys: string[] = [];
    const labels: string[] = [];
    const daysName = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      // Adjust date to Indonesia timezone
      date.setUTCHours(date.getUTCHours() + 7);
      date.setDate(date.getDate() - i);
      
      dateKeys.push(date.toISOString().split('T')[0]);
      
      // Calculate label
      const dayIndex = date.getDay();
      
      // If it's today, we can name it 'Hari Ini', otherwise day name
      if (i === 0) {
        labels.push('Hari Ini');
      } else {
        labels.push(daysName[dayIndex]);
      }
    }

    const absenCounts = await Promise.all(
      dateKeys.map(async (dateStr) => {
        const { count } = await supabase
          .from('absensi_tumbler')
          .select('*', { count: 'exact', head: true })
          .eq('tanggal', dateStr);
        return count ?? 0;
      }),
    );

    const data = absenCounts.map((absenCount) =>
      totalSiswaAktifCount > 0
        ? parseFloat(((absenCount / totalSiswaAktifCount) * 100).toFixed(1))
        : 0,
    );

    return {
      labels,
      data,
      dateKeys, // For client debugging if needed
    };
  }

  // ==========================================
  // 3. TOP 10 LEADERBOARD
  // ==========================================
  private async getLeaderboard() {
    const supabase = this.supabaseService.getClient();

    const { data: siswaList } = await supabase
      .from('siswa')
      .select(`
        nis,
        nama,
        coins,
        streak,
        foto_url,
        kelas:kelas_id (
          nama
        )
      `)
      .eq('is_active', true)
      .order('coins', { ascending: false })
      .limit(10);

    // Map data dengan rank
    return siswaList?.map((siswa, index) => ({
      rank: index + 1,
      nis: siswa.nis,
      nama: siswa.nama,
      kelas: getRelationName(siswa.kelas as MaybeRelation<{ nama: string }>),
      coins: siswa.coins || 0,
      streak: siswa.streak || 0,
      foto_url: siswa.foto_url || null,
    })) || [];
  }

  // ==========================================
  // 4. RECENT ACTIVITIES (10 TERAKHIR)
  // ==========================================
  private async getRecentActivities() {
    const supabase = this.supabaseService.getClient();

    // Get 5 absensi terakhir
    const { data: absensiData } = await supabase
      .from('absensi_tumbler')
      .select(`
        id,
        coins_reward,
        created_at,
        siswa:nis (
          nama
        )
      `)
      .order('created_at', { ascending: false })
      .limit(5);

    // Get 5 pelanggaran terakhir
    const { data: pelanggaranData } = await supabase
      .from('pelanggaran')
      .select(`
        id,
        coins_penalty,
        created_at,
        siswa:nis (
          nama
        )
      `)
      .order('created_at', { ascending: false })
      .limit(5);

    // Gabungkan dan format data
    const activities = [
      // Format absensi
      ...(absensiData?.map(item => ({
        id: `absensi-${item.id}`,
        type: 'absensi' as const,
        siswa: getRelationName(
          item.siswa as MaybeRelation<{ nama: string }>,
          'Unknown',
        ),
        keterangan: 'Absensi tumbler',
        coins: item.coins_reward,
        timestamp: item.created_at,
      })) || []),

      // Format pelanggaran
      ...(pelanggaranData?.map(item => ({
        id: `pelanggaran-${item.id}`,
        type: 'pelanggaran' as const,
        siswa: getRelationName(
          item.siswa as MaybeRelation<{ nama: string }>,
          'Unknown',
        ),
        keterangan: 'Tidak membawa tumbler',
        coins: -Math.abs(item.coins_penalty), // Negatif untuk pelanggaran
        timestamp: item.created_at,
      })) || []),
    ];

    // Sort by timestamp (terbaru dulu)
    activities.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Return 10 terakhir
    return activities.slice(0, 10);
  }
}
