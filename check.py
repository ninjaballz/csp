#!/usr/bin/env python3
"""
Random CIDR IP Range Fetcher with Spam Checking
Fetches random CIDR ranges from random countries around the world.
Source: https://github.com/ebrasha/cidr-ip-ranges-by-country
Only saves clean CIDRs that pass blacklist checks.
"""

import random
import requests
import argparse
import sys
import socket
import ipaddress
from datetime import datetime, timezone

# All country codes (ISO 3166-1 alpha-2)
COUNTRY_CODES = [
    'AD', 'AE', 'AF', 'AG', 'AI', 'AL', 'AM', 'AO', 'AR', 'AS', 'AT', 'AU', 'AW', 'AX', 'AZ',
    'BA', 'BB', 'BD', 'BE', 'BF', 'BG', 'BH', 'BI', 'BJ', 'BL', 'BM', 'BN', 'BO', 'BR', 'BS',
    'BT', 'BW', 'BY', 'BZ', 'CA', 'CD', 'CF', 'CG', 'CH', 'CI', 'CK', 'CL', 'CM', 'CN', 'CO',
    'CR', 'CU', 'CV', 'CW', 'CY', 'CZ', 'DE', 'DJ', 'DK', 'DM', 'DO', 'DZ', 'EC', 'EE', 'EG',
    'ER', 'ES', 'ET', 'FI', 'FJ', 'FK', 'FM', 'FO', 'FR', 'GA', 'GB', 'GD', 'GE', 'GF', 'GG',
    'GH', 'GI', 'GL', 'GM', 'GN', 'GP', 'GQ', 'GR', 'GT', 'GU', 'GW', 'GY', 'HK', 'HN', 'HR',
    'HT', 'HU', 'ID', 'IE', 'IL', 'IM', 'IN', 'IQ', 'IR', 'IS', 'IT', 'JE', 'JM', 'JO', 'JP',
    'KE', 'KG', 'KH', 'KI', 'KM', 'KN', 'KP', 'KR', 'KW', 'KY', 'KZ', 'LA', 'LB', 'LC', 'LI',
    'LK', 'LR', 'LS', 'LT', 'LU', 'LV', 'LY', 'MA', 'MC', 'MD', 'ME', 'MF', 'MG', 'MH', 'MK',
    'ML', 'MM', 'MN', 'MO', 'MP', 'MQ', 'MR', 'MS', 'MT', 'MU', 'MV', 'MW', 'MX', 'MY', 'MZ',
    'NA', 'NC', 'NE', 'NF', 'NG', 'NI', 'NL', 'NO', 'NP', 'NR', 'NU', 'NZ', 'OM', 'PA', 'PE',
    'PF', 'PG', 'PH', 'PK', 'PL', 'PM', 'PR', 'PS', 'PT', 'PW', 'PY', 'QA', 'RE', 'RO', 'RS',
    'RU', 'RW', 'SA', 'SB', 'SC', 'SD', 'SE', 'SG', 'SI', 'SK', 'SL', 'SM', 'SN', 'SO', 'SR',
    'SS', 'ST', 'SV', 'SX', 'SY', 'SZ', 'TC', 'TD', 'TG', 'TH', 'TJ', 'TK', 'TL', 'TM', 'TN',
    'TO', 'TR', 'TT', 'TV', 'TW', 'TZ', 'UA', 'UG', 'US', 'UY', 'UZ', 'VA', 'VC', 'VE', 'VG',
    'VI', 'VN', 'VU', 'WF', 'WS', 'YE', 'YT', 'ZA', 'ZM', 'ZW',
]

BASE_URL = "https://raw.githubusercontent.com/ebrasha/cidr-ip-ranges-by-country/refs/heads/master/CIDR/{}-ipv4-Hackers.Zone.txt"


class FastBlacklistChecker:
    """Ultra-fast blacklist checker for SMTP"""
    
    def check_spamhaus_zen(self, ip):
        """Check Spamhaus ZEN - comprehensive SMTP blacklist check"""
        reversed_ip = '.'.join(reversed(ip.split('.')))
        query = f"{reversed_ip}.zen.spamhaus.org"
        
        try:
            socket.setdefaulttimeout(3)
            result = socket.gethostbyname(query)
            
            result_parts = result.split('.')
            if len(result_parts) == 4 and result_parts[0:3] == ['127', '0', '0']:
                code = int(result_parts[3])
                
                if code & 2:  # SBL
                    return False, 95
                elif code & 4:  # CSS
                    return False, 90
                elif code & 8:  # PBL
                    return False, 85
                elif code & 16:  # XBL
                    return False, 100
                else:
                    return False, 80
            
            return False, 90
            
        except socket.gaierror:
            return True, 0
        except Exception:
            return None, 50
    
    def check_stopforumspam(self, ip):
        """Quick StopForumSpam check"""
        try:
            url = f"https://api.stopforumspam.org/api?ip={ip}&json"
            response = requests.get(url, timeout=3)
            
            if response.status_code == 200:
                data = response.json()
                appears = data.get('ip', {}).get('appears', 0)
                if appears == 0:
                    return True, 0
                else:
                    confidence = min(data.get('ip', {}).get('confidence', 50), 100)
                    return False, confidence
        except Exception:
            pass
        
        return None, 25
    
    def check_sorbs(self, ip):
        """Check SORBS SMTP blacklist"""
        reversed_ip = '.'.join(reversed(ip.split('.')))
        
        sorbs_lists = [
            'dnsbl.sorbs.net',
            'smtp.dnsbl.sorbs.net',
            'spam.dnsbl.sorbs.net'
        ]
        
        for dnsbl in sorbs_lists:
            try:
                query = f"{reversed_ip}.{dnsbl}"
                socket.setdefaulttimeout(2)
                socket.gethostbyname(query)
                return False, 85
            except socket.gaierror:
                continue
            except:
                continue
        
        return True, 0
    
    def check_barracuda(self, ip):
        """Check Barracuda reputation block list"""
        reversed_ip = '.'.join(reversed(ip.split('.')))
        query = f"{reversed_ip}.b.barracudacentral.org"
        
        try:
            socket.setdefaulttimeout(2)
            socket.gethostbyname(query)
            return False, 80
        except socket.gaierror:
            return True, 0
        except:
            return None, 25
    
    def get_spam_score(self, ip, verbose=False):
        """Get comprehensive SMTP spam score"""
        if verbose:
            print(f"    🔍 Checking {ip}...")
        
        spamhaus_clean, spamhaus_score = self.check_spamhaus_zen(ip)
        sorbs_clean, sorbs_score = self.check_sorbs(ip)
        barracuda_clean, barracuda_score = self.check_barracuda(ip)
        sfs_clean, sfs_score = self.check_stopforumspam(ip)
        
        if spamhaus_clean is False:
            if verbose:
                print(f"    ❌ Spamhaus: LISTED (score: {spamhaus_score})")
            return spamhaus_score, True
        
        scores = []
        results = []
        
        if spamhaus_clean is not None:
            scores.append(spamhaus_score)
            results.append(f"Spamhaus: {'✅ Clean' if spamhaus_clean else '❌ Listed'}")
        
        if sorbs_clean is not None:
            scores.append(sorbs_score)
            results.append(f"SORBS: {'✅ Clean' if sorbs_clean else '❌ Listed'}")
        
        if barracuda_clean is not None:
            scores.append(barracuda_score)
            results.append(f"Barracuda: {'✅ Clean' if barracuda_clean else '❌ Listed'}")
        
        if sfs_clean is not None:
            scores.append(sfs_score)
            results.append(f"SFS: {'✅ Clean' if sfs_clean else '❌ Listed'}")
        
        if verbose:
            for result in results:
                print(f"      {result}")
        
        if not scores:
            return 50, False
        
        avg_score = sum(scores) / len(scores) if len(scores) >= 3 else max(scores)
        is_blacklisted = avg_score > 15
        
        if verbose:
            print(f"    📊 Final score: {avg_score:.1f} ({'❌ Risky' if is_blacklisted else '✅ Good'})")
        
        return avg_score, is_blacklisted


def generate_test_ip(cidr):
    """Generate random IP from CIDR for testing"""
    try:
        network = ipaddress.IPv4Network(cidr, strict=False)
        all_hosts = list(network.hosts())
        
        if len(all_hosts) > 10:
            middle = len(all_hosts) // 2
            offset = random.randint(-min(100, middle//2), min(100, middle//2))
            return str(all_hosts[middle + offset])
        elif all_hosts:
            return str(random.choice(all_hosts))
        else:
            return str(network.network_address + 1)
    except:
        return None


def fetch_cidr_for_country(country_code: str, max_lines: int = 10, check_spam: bool = True, verbose: bool = False) -> list:
    """
    Fetch CIDR ranges for a specific country.
    Returns a random sample of CIDR lines, optionally filtered for spam.
    """
    url = BASE_URL.format(country_code.upper())
    
    try:
        resp = requests.get(url, timeout=10)
        if resp.status_code != 200:
            return []
        
        lines = resp.text.strip().split('\n')
        
        # Filter out comments and empty lines
        cidr_lines = [
            line.strip() for line in lines 
            if line.strip() and not line.startswith('#')
        ]
        
        if not cidr_lines:
            return []
        
        # Get more candidates if we're doing spam checking
        candidate_count = max_lines * 3 if check_spam else max_lines
        sample_size = min(candidate_count, len(cidr_lines))
        candidates = random.sample(cidr_lines, sample_size)
        
        if not check_spam:
            return candidates[:max_lines]
        
        # Spam check each CIDR
        checker = FastBlacklistChecker()
        clean_cidrs = []
        
        if verbose:
            print(f"  🔍 Testing {len(candidates)} CIDRs for {country_code}...")
        
        for cidr in candidates:
            if len(clean_cidrs) >= max_lines:
                break
            
            test_ip = generate_test_ip(cidr)
            if not test_ip:
                continue
            
            score, is_blacklisted = checker.get_spam_score(test_ip, verbose=verbose)
            
            if not is_blacklisted and score <= 15:
                clean_cidrs.append(cidr)
                if verbose:
                    print(f"    ✅ {cidr} - Clean (score: {score:.1f})")
            else:
                if verbose:
                    print(f"    ❌ {cidr} - Blacklisted (score: {score:.1f})")
        
        return clean_cidrs
        
    except Exception as e:
        if verbose:
            print(f"  Error fetching {country_code}: {e}")
        return []


def fetch_random_cidrs(
    num_countries: int = 20,
    lines_per_country: int = 5,
    verbose: bool = False,
    check_spam: bool = True
) -> dict:
    """
    Fetch random CIDR ranges from random countries.
    
    Args:
        num_countries: Number of random countries to fetch from
        lines_per_country: Max CIDR lines per country
        verbose: Print progress
        check_spam: Check CIDRs against spam blacklists
    
    Returns:
        Dict mapping country code to list of CIDR ranges
    """
    # Pick random countries
    selected_countries = random.sample(COUNTRY_CODES, min(num_countries, len(COUNTRY_CODES)))
    
    results = {}
    
    for i, country in enumerate(selected_countries):
        if verbose:
            print(f"[{i+1}/{num_countries}] Fetching {country}...", end=' ' if not check_spam else '\n', flush=True)
        
        cidrs = fetch_cidr_for_country(country, lines_per_country, check_spam=check_spam, verbose=verbose)
        
        if cidrs:
            results[country] = cidrs
            if verbose:
                if check_spam:
                    print(f"  ✅ {country}: got {len(cidrs)} clean ranges")
                else:
                    print(f"got {len(cidrs)} ranges")
        else:
            if verbose:
                print(f"  ❌ {country}: empty/failed" if check_spam else "empty/failed")
    
    return results


def get_flat_cidr_list(
    num_countries: int = 20,
    lines_per_country: int = 5,
    shuffle: bool = True,
    check_spam: bool = True
) -> list:
    """
    Get a flat list of random CIDR ranges from random countries.
    """
    results = fetch_random_cidrs(num_countries, lines_per_country, verbose=False, check_spam=check_spam)
    
    all_cidrs = []
    for country, cidrs in results.items():
        for cidr in cidrs:
            all_cidrs.append((country, cidr))
    
    if shuffle:
        random.shuffle(all_cidrs)
    
    return all_cidrs


def main():
    parser = argparse.ArgumentParser(
        description='Fetch random CIDR IP ranges from random countries with spam checking'
    )
    parser.add_argument(
        '-c', '--countries',
        type=int,
        default=20,
        help='Number of random countries to fetch (default: 20)'
    )
    parser.add_argument(
        '-l', '--lines',
        type=int,
        default=5,
        help='Max CIDR lines per country (default: 5)'
    )
    parser.add_argument(
        '-v', '--verbose',
        action='store_true',
        help='Show progress'
    )
    parser.add_argument(
        '-f', '--flat',
        action='store_true',
        default=True,
        help='Output flat list (CIDR only, no country labels) - default: True'
    )
    parser.add_argument(
        '-g', '--grouped',
        action='store_true',
        help='Output grouped by country with headers'
    )
    parser.add_argument(
        '-o', '--output',
        type=str,
        default='cidr-ranges.txt',
        help='Output file (default: cidr-ranges.txt)'
    )
    parser.add_argument(
        '--no-spam-check',
        action='store_true',
        help='Skip spam/blacklist checking (faster but may include bad IPs)'
    )
    
    args = parser.parse_args()
    
    check_spam = not args.no_spam_check
    
    if args.verbose:
        print(f"🚀 CIDR Range Fetcher with Spam Checking")
        print(f"📅 Time: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')} UTC")
        print(f"📧 Spam checking: {'✅ Enabled' if check_spam else '❌ Disabled'}")
        print(f"Fetching from {args.countries} random countries, up to {args.lines} ranges each...\n")
    
    results = fetch_random_cidrs(args.countries, args.lines, args.verbose, check_spam=check_spam)
    
    if args.verbose:
        print()
    
    # Build output
    output_lines = []
    
    if args.grouped:
        # Grouped by country
        for country, cidrs in sorted(results.items()):
            output_lines.append(f"# {country}")
            output_lines.extend(cidrs)
            output_lines.append("")
    else:
        # Flat list - just CIDRs (default)
        all_cidrs = []
        for cidrs in results.values():
            all_cidrs.extend(cidrs)
        random.shuffle(all_cidrs)
        output_lines = all_cidrs
    
    output_text = '\n'.join(output_lines)
    
    if args.output:
        with open(args.output, 'w') as f:
            f.write(output_text)
        if args.verbose:
            print(f"Saved to {args.output}")
    else:
        print(output_text)
    
    # Always print summary
    total = sum(len(v) for v in results.values())
    spam_status = "clean" if check_spam else "unchecked"
    print(f"✓ Saved {total} {spam_status} CIDR ranges from {len(results)} countries to {args.output}")


if __name__ == '__main__':
    main()
