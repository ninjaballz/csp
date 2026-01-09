#!/usr/bin/env python3
"""
Random CIDR IP Range Fetcher
Fetches random CIDR ranges from random countries around the world.
Source: https://github.com/ebrasha/cidr-ip-ranges-by-country
"""

import random
import requests
import argparse
import sys

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


def fetch_cidr_for_country(country_code: str, max_lines: int = 10) -> list:
    """
    Fetch CIDR ranges for a specific country.
    Returns a random sample of CIDR lines.
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
        
        # Random sample
        sample_size = min(max_lines, len(cidr_lines))
        return random.sample(cidr_lines, sample_size)
        
    except Exception as e:
        return []


def fetch_random_cidrs(
    num_countries: int = 20,
    lines_per_country: int = 5,
    verbose: bool = False
) -> dict:
    """
    Fetch random CIDR ranges from random countries.
    
    Args:
        num_countries: Number of random countries to fetch from
        lines_per_country: Max CIDR lines per country
        verbose: Print progress
    
    Returns:
        Dict mapping country code to list of CIDR ranges
    """
    # Pick random countries
    selected_countries = random.sample(COUNTRY_CODES, min(num_countries, len(COUNTRY_CODES)))
    
    results = {}
    
    for i, country in enumerate(selected_countries):
        if verbose:
            print(f"[{i+1}/{num_countries}] Fetching {country}...", end=' ', flush=True)
        
        cidrs = fetch_cidr_for_country(country, lines_per_country)
        
        if cidrs:
            results[country] = cidrs
            if verbose:
                print(f"got {len(cidrs)} ranges")
        else:
            if verbose:
                print("empty/failed")
    
    return results


def get_flat_cidr_list(
    num_countries: int = 20,
    lines_per_country: int = 5,
    shuffle: bool = True
) -> list:
    """
    Get a flat list of random CIDR ranges from random countries.
    """
    results = fetch_random_cidrs(num_countries, lines_per_country, verbose=False)
    
    all_cidrs = []
    for country, cidrs in results.items():
        for cidr in cidrs:
            all_cidrs.append((country, cidr))
    
    if shuffle:
        random.shuffle(all_cidrs)
    
    return all_cidrs


def main():
    parser = argparse.ArgumentParser(
        description='Fetch random CIDR IP ranges from random countries'
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
        help='Output flat list (CIDR only, no country labels)'
    )
    parser.add_argument(
        '-o', '--output',
        type=str,
        default='cidr-ranges.txt',
        help='Output file (default: cidr-ranges.txt)'
    )
    
    args = parser.parse_args()
    
    if args.verbose:
        print(f"Fetching from {args.countries} random countries, up to {args.lines} ranges each...\n")
    
    results = fetch_random_cidrs(args.countries, args.lines, args.verbose)
    
    if args.verbose:
        print()
    
    # Build output
    output_lines = []
    
    if args.flat:
        # Flat list - just CIDRs
        all_cidrs = []
        for cidrs in results.values():
            all_cidrs.extend(cidrs)
        random.shuffle(all_cidrs)
        output_lines = all_cidrs
    else:
        # Grouped by country
        for country, cidrs in sorted(results.items()):
            output_lines.append(f"# {country}")
            output_lines.extend(cidrs)
            output_lines.append("")
    
    output_text = '\n'.join(output_lines)
    
    if args.output:
        with open(args.output, 'w') as f:
            f.write(output_text)
        if args.verbose:
            print(f"Saved to {args.output}")
    else:
        print(output_text)
    
    if args.verbose:
        total = sum(len(v) for v in results.values())
        print(f"\nTotal: {total} CIDR ranges from {len(results)} countries")
    
    # Always print summary
    total = sum(len(v) for v in results.values())
    print(f"✓ Saved {total} CIDR ranges from {len(results)} countries to {args.output}")


if __name__ == '__main__':
    main()
