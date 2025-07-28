#!/usr/bin/env python3
"""
Clean CIDR Auto-Fetcher with BGPView ASN Discovery for ninjaballz
Fixed: Correctly parse BGPView API response
Created: 2025-07-26 09:05:12 UTC
"""

import os
import json
import requests
import random
import ipaddress
import socket
import sys
import argparse
from datetime import datetime
import time

# Configuration
MAX_CIDRS_TO_SAVE = 3  # Save 2-3 best CIDRs per country

class FastBlacklistChecker:
    """Ultra-fast blacklist checker"""
    
    def check_spamhaus_zen(self, ip):
        """Check Spamhaus ZEN - comprehensive SMTP blacklist check"""
        reversed_ip = '.'.join(reversed(ip.split('.')))
        query = f"{reversed_ip}.zen.spamhaus.org"
        
        try:
            socket.setdefaulttimeout(3)
            result = socket.gethostbyname(query)
            
            # If we get a result, the IP is blacklisted
            # Spamhaus returns different codes for different types of listings
            result_parts = result.split('.')
            if len(result_parts) == 4 and result_parts[0:3] == ['127', '0', '0']:
                code = int(result_parts[3])
                
                # Spamhaus return codes
                if code & 2:  # SBL (Spamhaus Block List)
                    return False, 95  # Very bad for SMTP
                elif code & 4:  # CSS (Spamhaus CSS)
                    return False, 90  # Bad for SMTP
                elif code & 8:  # PBL (Policy Block List)
                    return False, 85  # Residential/dynamic IPs
                elif code & 16:  # XBL (Exploits Block List)
                    return False, 100  # Compromised machines
                else:
                    return False, 80  # Listed but unknown reason
            
            return False, 90  # Listed but couldn't parse code
            
        except socket.gaierror:
            # No DNS record found = not listed = good for SMTP
            return True, 0
        except Exception as e:
            print(f"    Spamhaus error: {e}")
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
        except Exception as e:
            print(f"    SFS error: {e}")
        
        return None, 25
    
    def check_sorbs(self, ip):
        """Check SORBS SMTP blacklist"""
        reversed_ip = '.'.join(reversed(ip.split('.')))
        
        # Check multiple SORBS lists
        sorbs_lists = [
            'dnsbl.sorbs.net',      # Main SORBS list
            'smtp.dnsbl.sorbs.net', # SMTP-specific
            'spam.dnsbl.sorbs.net'  # Spam sources
        ]
        
        for dnsbl in sorbs_lists:
            try:
                query = f"{reversed_ip}.{dnsbl}"
                socket.setdefaulttimeout(2)
                result = socket.gethostbyname(query)
                # If we get a result, IP is listed
                return False, 85
            except socket.gaierror:
                continue  # Not listed in this DNSBL
            except:
                continue
        
        return True, 0  # Not listed in any SORBS list
    
    def check_barracuda(self, ip):
        """Check Barracuda reputation block list"""
        reversed_ip = '.'.join(reversed(ip.split('.')))
        query = f"{reversed_ip}.b.barracudacentral.org"
        
        try:
            socket.setdefaulttimeout(2)
            result = socket.gethostbyname(query)
            return False, 80  # Listed = bad for SMTP
        except socket.gaierror:
            return True, 0    # Not listed = good
        except:
            return None, 25
    
    def get_spam_score(self, ip, quiet=False):
        """Get comprehensive SMTP spam score"""
        if not quiet:
            print(f"    🔍 Checking {ip}...")
        
        # Check all blacklists
        spamhaus_clean, spamhaus_score = self.check_spamhaus_zen(ip)
        sorbs_clean, sorbs_score = self.check_sorbs(ip)
        barracuda_clean, barracuda_score = self.check_barracuda(ip)
        sfs_clean, sfs_score = self.check_stopforumspam(ip)
        
        # If Spamhaus (most important for SMTP) says it's bad, it's bad
        if spamhaus_clean is False:
            if not quiet:
                print(f"    ❌ Spamhaus: LISTED (score: {spamhaus_score})")
            return spamhaus_score, True
        
        # Collect all valid scores
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
        
        # Print results
        if not quiet:
            for result in results:
                print(f"      {result}")
        
        if not scores:
            if not quiet:
                print("    ⚠️  No blacklist results")
            return 50, False
        
        # Calculate weighted average (Spamhaus gets more weight)
        if len(scores) >= 3:
            # If we have multiple scores, use weighted average
            avg_score = sum(scores) / len(scores)
        else:
            # If limited data, be more conservative
            avg_score = max(scores) if scores else 50
        
        # For SMTP, be strict - anything above 15 is risky
        is_blacklisted = avg_score > 15
        
        if not quiet:
            print(f"    📊 Final score: {avg_score:.1f} ({'❌ Risky' if is_blacklisted else '✅ Good'} for SMTP)")
        
        return avg_score, is_blacklisted

def get_random_asns_from_bgpview(country_code, quiet=False):
    """Fetch ASNs from BGPView search API and select randomly"""
    if not quiet:
        print(f"🔍 Searching ASNs for {country_code} from BGPView...")
    
    url = f"https://vector-astro-39.uniofemo.workers.dev/?url=https://api.bgpview.io/search?query_term={country_code}"
    
    try:
        response = requests.get(url, timeout=15, headers={'User-Agent': 'Mozilla/5.0'})
        
        if response.status_code == 200:
            data = response.json()
            
            # Debug: Show what we got
            if not quiet:
                print(f"📊 API Response status: {data.get('status')}")
                print(f"📊 API Response message: {data.get('status_message')}")
            
            # The ASNs are in data.data.asns (nested)
            asns_data = data.get('data', {})
            asns_list = asns_data.get('asns', [])
            
            if not asns_list:
                if not quiet:
                    print(f"⚠️  No ASNs in response for {country_code}")
                # Try alternative approach - search by country name
                return get_asns_by_country_name(country_code, quiet=quiet)
            
            if not quiet:
                print(f"✅ Found {len(asns_list)} ASNs for {country_code}")
            
            # Filter for residential ISPs
            residential_asns = []
            
            for asn_entry in asns_list:
                asn = asn_entry.get('asn')
                name = asn_entry.get('name', '').upper()
                description = asn_entry.get('description', '').upper()
                country = asn_entry.get('country_code', '').upper()
                
                # Make sure it's the right country
                if country != country_code.upper() and country_code != 'US':
                    continue
                
                # Skip cloud/hosting providers
                skip_keywords = [
                    'AMAZON', 'GOOGLE', 'MICROSOFT', 'CLOUD', 'HOSTING',
                    'DIGITALOCEAN', 'LINODE', 'VULTR', 'SERVER', 'DATACENTER',
                    'VPS', 'DEDICATED', 'COLOCATION', 'CDN', 'CONTENT DELIVERY'
                ]
                
                # Look for residential indicators
                residential_keywords = [
                    'TELECOM', 'BROADBAND', 'CABLE', 'DSL', 'FIBER',
                    'INTERNET', 'COMMUNICATIONS', 'TELEKOM', 'MOBILE',
                    'WIRELESS', 'ISP', 'NETWORK', 'RESIDENTIAL'
                ]
                
                # For US, we know these are residential
                us_residential = [
                    'COMCAST', 'VERIZON', 'AT&T', 'SPECTRUM', 'COX',
                    'CENTURYLINK', 'CHARTER', 'FRONTIER', 'WINDSTREAM',
                    'OPTIMUM', 'XFINITY', 'RCN', 'ATLANTIC'
                ]
                
                full_text = f"{name} {description}"
                
                # Skip if cloud/hosting
                if any(skip in full_text for skip in skip_keywords):
                    continue
                
                # Priority 1: Known residential (US)
                if country_code == 'US' and any(res in full_text for res in us_residential):
                    residential_asns.append({
                        'asn': asn,
                        'name': asn_entry.get('name', ''),
                        'description': asn_entry.get('description', ''),
                        'priority': 1
                    })
                # Priority 2: Has residential keywords
                elif any(keyword in full_text for keyword in residential_keywords):
                    residential_asns.append({
                        'asn': asn,
                        'name': asn_entry.get('name', ''),
                        'description': asn_entry.get('description', ''),
                        'priority': 2
                    })
                # Priority 3: Unknown but not cloud
                else:
                    residential_asns.append({
                        'asn': asn,
                        'name': asn_entry.get('name', ''),
                        'description': asn_entry.get('description', ''),
                        'priority': 3
                    })
            
            if not residential_asns:
                if not quiet:
                    print("⚠️  No residential ASNs identified, using top ASNs")
                # Use first few ASNs as fallback
                for asn_entry in asns_list[:10]:
                    residential_asns.append({
                        'asn': asn_entry.get('asn'),
                        'name': asn_entry.get('name', ''),
                        'description': asn_entry.get('description', ''),
                        'priority': 4
                    })
            
            if not quiet:
                print(f"📊 Identified {len(residential_asns)} potential residential ASNs")
            
            # Sort by priority
            residential_asns.sort(key=lambda x: x['priority'])
            
            # Randomly select 2-3 ASNs
            num_to_select = random.randint(2, min(3, len(residential_asns)))
            
            # Get mix of priorities
            selected_asns = []
            
            # Try to get at least one high priority
            high_priority = [a for a in residential_asns if a['priority'] <= 2]
            if high_priority:
                selected_asns.append(random.choice(high_priority))
                num_to_select -= 1
            
            # Fill the rest randomly
            remaining = [a for a in residential_asns if a not in selected_asns]
            if remaining and num_to_select > 0:
                selected_asns.extend(random.sample(remaining, min(num_to_select, len(remaining))))
            
            # If still not enough, just take what we have
            if not selected_asns and residential_asns:
                selected_asns = residential_asns[:3]
            
            # Extract ASN numbers
            selected_asn_numbers = [a['asn'] for a in selected_asns]
            
            if not quiet:
                print(f"🎲 Randomly selected {len(selected_asn_numbers)} ASNs:")
                for asn_info in selected_asns:
                    print(f"   AS{asn_info['asn']}: {asn_info['name']} - {asn_info['description'][:50]}...")
            
            return selected_asn_numbers
            
    except Exception as e:
        if not quiet:
            print(f"❌ Error fetching from BGPView: {e}")
            import traceback
            traceback.print_exc()
    
    return []

def get_asns_by_country_name(country_code, quiet=False):
    """Alternative: Get ASNs by searching country name"""
    country_names = {
        'US': 'United States',
        'GB': 'United Kingdom',
        'DE': 'Germany',
        'CA': 'Canada',
        'AU': 'Australia',
        'FR': 'France',
        'NL': 'Netherlands',
        'JP': 'Japan',
        'BR': 'Brazil',
        'IN': 'India'
    }
    
    country_name = country_names.get(country_code, country_code)
    if not quiet:
        print(f"🔍 Trying alternative search for: {country_name}")
    
    # Alternative approach - use known residential ASNs
    known_residential = {
        'US': [11025, 10796, 11427, 10507, 11426, 7922, 701, 7018],  # Comcast, Verizon, AT&T, etc
        'GB': [2856, 5089, 5607, 13285],  # BT, Virgin, Sky, TalkTalk
        'DE': [3320, 6830, 31334],  # Deutsche Telekom, Vodafone
        'CA': [577, 6327, 5769],  # Bell, Shaw, Rogers
        'AU': [1221, 7545, 4764],  # Telstra, TPG, Optus
    }
    
    if country_code in known_residential:
        asns = known_residential[country_code]
        selected = random.sample(asns, min(3, len(asns)))
        if not quiet:
            print(f"✅ Using known residential ASNs: {selected}")
        return selected
    
    return []

def fetch_prefixes_for_asn(asn, quiet=False):
    """Fetch prefixes for ASN from BGPView"""
    url = f"https://vector-astro-39.uniofemo.workers.dev/?url=https://api.bgpview.io/search?query_term=https://api.bgpview.io/asn/{asn}/prefixes"
    
    try:
        response = requests.get(url, timeout=10, headers={'User-Agent': 'Mozilla/5.0'})
        if response.status_code == 200:
            data = response.json()
            prefixes = []
            
            # Get IPv4 prefixes
            ipv4_prefixes = data.get('data', {}).get('ipv4_prefixes', [])
            
            for p in ipv4_prefixes:
                prefix = p.get('prefix')
                if prefix:
                    try:
                        network = ipaddress.IPv4Network(prefix)
                        # Prefer residential-sized blocks (/16 to /24)
                        if 16 <= network.prefixlen <= 24:
                            prefixes.append(prefix)
                    except:
                        pass
            
            # Return random selection
            if len(prefixes) > 5:
                return random.sample(prefixes, 5)
            return prefixes
    except Exception as e:
        if not quiet:
            print(f"  ❌ Error fetching AS{asn}: {e}")
    
    return []

def generate_test_ip(cidr):
    """Generate random IP from CIDR for testing"""
    try:
        network = ipaddress.IPv4Network(cidr, strict=False)
        all_hosts = list(network.hosts())
        
        if len(all_hosts) > 10:
            # Pick from middle of range
            middle = len(all_hosts) // 2
            offset = random.randint(-min(100, middle//2), min(100, middle//2))
            return str(all_hosts[middle + offset])
        elif all_hosts:
            return str(random.choice(all_hosts))
        else:
            return str(network.network_address + 1)
    except:
        return None

def get_countries_from_user():
    """Get country codes from user input or environment/args"""
    
    # Check for environment variable first (for GitHub Actions)
    env_countries = os.environ.get('COUNTRIES', '').strip()
    if env_countries:
        print(f"🌍 Using countries from environment: {env_countries}")
        countries = []
        for country in env_countries.upper().split(','):
            country = country.strip()
            if len(country) == 2 and country.isalpha():
                countries.append(country)
            else:
                print(f"⚠️  Invalid country code from env: {country} (must be 2 letters)")
        
        if countries:
            print(f"✅ Selected countries from environment: {', '.join(countries)}")
            return countries
        else:
            print("❌ No valid country codes in environment variable")
    
    # Check if we're in a non-interactive environment (GitHub Actions)
    if not sys.stdin.isatty() or os.environ.get('CI') == 'true' or os.environ.get('GITHUB_ACTIONS') == 'true':
        print("🤖 Running in automated/CI environment")
        print("💡 Use COUNTRIES environment variable or --countries argument")
        print("   Example: COUNTRIES='US,GB,DE' python check.py")
        print("   Or: python check.py --countries US,GB,DE")
        
        # Default to a common country if nothing specified
        default_country = os.environ.get('DEFAULT_COUNTRY', 'US')
        print(f"🎯 Using default country: {default_country}")
        return [default_country]
    
    # Interactive mode for local usage
    print("🌍 Country Selection")
    print("Enter country codes (e.g., US, GB, DE, MY, etc.)")
    print("You can enter multiple countries separated by commas")
    print("Examples:")
    print("  - Single: US")
    print("  - Multiple: US,GB,DE")
    print("  - Mixed: US, MY, GB")
    print()
    
    while True:
        try:
            user_input = input("Enter country code(s): ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\n❌ Input cancelled. Using default country: US")
            return ['US']
        
        if not user_input:
            print("❌ Please enter at least one country code")
            continue
        
        # Parse country codes
        countries = []
        for country in user_input.upper().split(','):
            country = country.strip()
            if len(country) == 2 and country.isalpha():
                countries.append(country)
            else:
                print(f"⚠️  Invalid country code: {country} (must be 2 letters)")
        
        if countries:
            print(f"✅ Selected countries: {', '.join(countries)}")
            return countries
        else:
            print("❌ No valid country codes found. Please try again.")

def get_total_cidrs_from_user():
    """Get total number of CIDRs from user input"""
    
    # Check environment variable first (for GitHub Actions)
    env_total = os.environ.get('TOTAL_CIDRS', '').strip()
    if env_total:
        try:
            total = int(env_total)
            if total > 0:
                print(f"📊 Using total CIDRs from environment: {total}")
                return total
        except ValueError:
            print(f"⚠️  Invalid TOTAL_CIDRS environment variable: {env_total}")
    
    # Check if we're in a non-interactive environment (GitHub Actions)
    if not sys.stdin.isatty() or os.environ.get('CI') == 'true' or os.environ.get('GITHUB_ACTIONS') == 'true':
        default_total = 20
        print(f"🤖 Using default total CIDRs for CI: {default_total}")
        return default_total
    
    # Interactive mode
    print("\n📊 CIDR Quantity Selection")
    print("How many clean CIDRs do you want in total?")
    print("Examples: 10, 20, 50, 100")
    print("(Will be distributed evenly across selected countries)")
    print()
    
    while True:
        try:
            user_input = input("Enter total number of CIDRs: ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\n❌ Input cancelled. Using default: 20")
            return 20
        
        try:
            total = int(user_input)
            if total <= 0:
                print("❌ Please enter a positive number")
                continue
            elif total > 200:
                print("⚠️  That's a lot! Are you sure? (Max recommended: 200)")
                confirm = input("Continue? (y/n): ").strip().lower()
                if confirm not in ['y', 'yes']:
                    continue
            
            print(f"✅ Will generate {total} clean CIDRs total")
            return total
            
        except ValueError:
            print("❌ Please enter a valid number")

def parse_arguments():
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(
        description='Clean CIDR Auto-Fetcher for SMTP Sending',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='''
Examples:
  python check.py                                   # Interactive mode
  python check.py --countries US,GB,DE --total-cidrs 30  # 30 CIDRs from 3 countries
  COUNTRIES=US,MY TOTAL_CIDRS=20 python check.py    # Environment variables
  
For GitHub Actions:
  - name: Get Clean CIDRs
    env:
      COUNTRIES: "US,GB,DE"
      TOTAL_CIDRS: "50"
    run: python check.py
        '''
    )
    
    parser.add_argument(
        '--total-cidrs', '-t',
        type=int,
        default=20,
        help='Total number of CIDRs to generate (default: 20)'
    )
    
    parser.add_argument(
        '--countries', '-c',
        type=str,
        help='Comma-separated list of country codes (e.g., US,GB,DE)'
    )
    
    parser.add_argument(
        '--max-cidrs', '-m',
        type=int,
        help='DEPRECATED: Use --total-cidrs instead'
    )
    
    parser.add_argument(
        '--output', '-o',
        type=str,
        default='cidr-ranges.txt',
        help='Output file for CIDR ranges (default: cidr-ranges.txt)'
    )
    
    parser.add_argument(
        '--report', '-r',
        type=str,
        default='clean-report.json',
        help='Output file for detailed report (default: clean-report.json)'
    )
    
    parser.add_argument(
        '--quiet', '-q',
        action='store_true',
        help='Reduce output verbosity'
    )
    
    return parser.parse_args()

def test_cidr_cleanliness(cidr, checker, quiet=False):
    """Test if CIDR is clean for SMTP sending"""
    test_ip = generate_test_ip(cidr)
    if not test_ip:
        return None
    
    score, is_blacklisted = checker.get_spam_score(test_ip, quiet=quiet)
    
    return {
        'cidr': cidr,
        'test_ip': test_ip,
        'score': score,
        'blacklisted': is_blacklisted,
        'clean': score <= 10  # Stricter threshold for SMTP
    }

def process_country(country, target_cidrs=3, quiet=False):
    """Process a single country and return clean CIDRs"""
    if not quiet:
        print(f"\n🌍 Processing Country: {country}")
        print("=" * 50)
    
    all_cidrs = []
    asn_map = {}
    max_retries = 8  # Increased retries for higher targets
    retry_count = 0
    
    # We need more CIDRs to test to find enough clean ones
    min_cidrs_needed = max(target_cidrs * 2, 10)
    
    while len(all_cidrs) < min_cidrs_needed and retry_count < max_retries:
        retry_count += 1
        if not quiet:
            print(f"\n🔄 Attempt {retry_count}/{max_retries} to find good ASNs for {country}...")
        
        # Get random ASNs from BGPView
        asns = get_random_asns_from_bgpview(country, quiet=quiet)
        
        if not asns:
            if not quiet:
                print("❌ No ASNs found in this attempt")
            continue
        
        # Collect CIDRs from ASNs
        attempt_cidrs = []
        attempt_asn_map = {}
        
        for asn in asns:
            if not quiet:
                print(f"📡 Fetching prefixes for AS{asn}...")
            prefixes = fetch_prefixes_for_asn(asn, quiet=quiet)
            
            if prefixes:
                if not quiet:
                    print(f"  ✅ Got {len(prefixes)} prefixes")
                for prefix in prefixes:
                    attempt_cidrs.append(prefix)
                    attempt_asn_map[prefix] = asn
            else:
                if not quiet:
                    print(f"  ⚠️  No prefixes found for AS{asn}")
            
            time.sleep(1)  # Rate limiting
        
        if attempt_cidrs:
            if not quiet:
                print(f"✅ Found {len(attempt_cidrs)} CIDRs in this attempt")
            all_cidrs.extend(attempt_cidrs)
            asn_map.update(attempt_asn_map)
            
            # Remove duplicates while preserving order
            seen = set()
            unique_cidrs = []
            unique_asn_map = {}
            for cidr in all_cidrs:
                if cidr not in seen:
                    seen.add(cidr)
                    unique_cidrs.append(cidr)
                    unique_asn_map[cidr] = asn_map[cidr]
            
            all_cidrs = unique_cidrs
            asn_map = unique_asn_map
            
            if len(all_cidrs) >= min_cidrs_needed:
                if not quiet:
                    print(f"🎯 Collected enough CIDRs ({len(all_cidrs)}), proceeding to test...")
                break
        else:
            if not quiet:
                print(f"❌ No CIDRs found in attempt {retry_count}, trying different ASNs...")
            time.sleep(2)  # Wait before retry
    
    if not all_cidrs:
        if not quiet:
            print(f"❌ No CIDRs collected for {country} after all attempts")
        return []
    
    # Test CIDRs for cleanliness
    if not quiet:
        print(f"\n🔍 Testing {len(all_cidrs)} CIDRs for SMTP cleanliness in {country}...")
        print(f"🎯 Target: {target_cidrs} clean CIDRs")
    
    checker = FastBlacklistChecker()
    tested_results = []
    
    # Test each CIDR
    for i, cidr in enumerate(all_cidrs):
        if not quiet:
            print(f"  [{i+1}/{len(all_cidrs)}] Testing {cidr}...")
        
        result = test_cidr_cleanliness(cidr, checker, quiet=quiet)
        if result:
            result['asn'] = asn_map.get(cidr, 'Unknown')
            result['country'] = country
            tested_results.append(result)
            
            if not quiet:
                if result['clean']:
                    print(f"    ✅ CLEAN for SMTP (score: {result['score']:.1f})")
                else:
                    print(f"    ❌ NOT CLEAN (score: {result['score']:.1f})")
        else:
            if not quiet:
                print("    ⚠️  Test failed")
        
        time.sleep(0.5)  # Rate limiting
    
    # Sort by score (lower is better)
    tested_results.sort(key=lambda x: x['score'])
    
    # Get the cleanest CIDRs up to target
    clean_cidrs = [r for r in tested_results if r['clean']][:target_cidrs]
    
    # If not enough clean ones, take best scored overall up to target
    if len(clean_cidrs) < target_cidrs:
        if not quiet:
            print(f"⚠️  Only {len(clean_cidrs)} truly clean CIDRs found, adding best available...")
        
        # Add best available non-clean CIDRs to reach target
        remaining_needed = target_cidrs - len(clean_cidrs)
        non_clean_cidrs = [r for r in tested_results if not r['clean']][:remaining_needed]
        
        for result in non_clean_cidrs:
            result['country'] = country
        
        clean_cidrs.extend(non_clean_cidrs)
    
    if not quiet:
        clean_count = len([r for r in clean_cidrs if r['clean']])
        total_count = len(clean_cidrs)
        print(f"\n✅ {country} Complete! Found {total_count} CIDRs ({clean_count} truly clean)")
    
    return clean_cidrs

def main():
    """Main function"""
    args = parse_arguments()
    
    if not args.quiet:
        print(f"🚀 Clean CIDR Auto-Fetcher for SMTP Sending")
        print(f"📅 Time: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC")
        print(f"📧 Optimized for SMTP delivery (strict blacklist checking)")
        
        # Show environment info for debugging
        if os.environ.get('GITHUB_ACTIONS') == 'true':
            print(f"🤖 Running in GitHub Actions")
        elif os.environ.get('CI') == 'true':
            print(f"🤖 Running in CI environment")
        
        print()
    
    # Get countries from args, environment, or user input
    if args.countries:
        # From command line argument
        countries = []
        for country in args.countries.upper().split(','):
            country = country.strip()
            if len(country) == 2 and country.isalpha():
                countries.append(country)
            else:
                print(f"⚠️  Invalid country code: {country} (must be 2 letters)")
        
        if not countries:
            print("❌ No valid countries in --countries argument")
            return
            
        if not args.quiet:
            print(f"✅ Using countries from arguments: {', '.join(countries)}")
    else:
        # From environment or interactive input
        countries = get_countries_from_user()
    
    # Get total CIDRs from args, environment, or user input
    if args.total_cidrs:
        total_cidrs = args.total_cidrs
        if not args.quiet:
            print(f"✅ Using total CIDRs from arguments: {total_cidrs}")
    else:
        total_cidrs = get_total_cidrs_from_user()
    
    # Calculate CIDRs per country (distribute evenly)
    cidrs_per_country = max(1, total_cidrs // len(countries))
    remaining_cidrs = total_cidrs % len(countries)
    
    if not args.quiet:
        print(f"\n📊 Distribution Plan:")
        print(f"   Total CIDRs needed: {total_cidrs}")
        print(f"   Countries: {len(countries)} ({', '.join(countries)})")
        print(f"   CIDRs per country: {cidrs_per_country}")
        if remaining_cidrs > 0:
            print(f"   Extra CIDRs for first {remaining_cidrs} countries: +1 each")
    
    # Process each country
    all_clean_cidrs = []
    country_results = {}
    
    for i, country in enumerate(countries):
        # Some countries get +1 CIDR to distribute remainder evenly
        country_target = cidrs_per_country + (1 if i < remaining_cidrs else 0)
        
        if not args.quiet:
            print(f"\n🎯 Target for {country}: {country_target} CIDRs")
        
        clean_cidrs = process_country(country, target_cidrs=country_target, quiet=args.quiet)
        if clean_cidrs:
            all_clean_cidrs.extend(clean_cidrs)
            country_results[country] = clean_cidrs
    
    if not all_clean_cidrs:
        print("❌ No clean CIDRs found for any country!")
        return
    
    # Write results - ONLY CIDRs in the main file
    with open(args.output, 'w') as f:
        # Write all CIDRs, no comments or headers
        for country in countries:
            if country in country_results:
                for result in country_results[country]:
                    f.write(f"{result['cidr']}\n")
    
    # Save detailed report with all the metadata
    report = {
        'timestamp': datetime.utcnow().isoformat(),
        'countries': countries,
        'total_cidrs_requested': total_cidrs,
        'total_cidrs_found': len(all_clean_cidrs),
        'distribution': {
            'cidrs_per_country': cidrs_per_country,
            'remaining_cidrs': remaining_cidrs
        },
        'results_by_country': {},
        'summary': {
            'countries_processed': len(countries),
            'countries_with_results': len(country_results),
        },
        'environment': {
            'github_actions': os.environ.get('GITHUB_ACTIONS') == 'true',
            'ci': os.environ.get('CI') == 'true',
            'runner_os': os.environ.get('RUNNER_OS', 'unknown')
        }
    }
    
    # Add detailed results for each country
    for country in countries:
        if country in country_results:
            report['results_by_country'][country] = {
                'target_cidrs': cidrs_per_country + (1 if countries.index(country) < remaining_cidrs else 0),
                'clean_cidrs_found': len(country_results[country]),
                'saved_cidrs': [r['cidr'] for r in country_results[country]],
                'detailed_results': country_results[country]
            }
        else:
            target = cidrs_per_country + (1 if countries.index(country) < remaining_cidrs else 0)
            report['results_by_country'][country] = {
                'target_cidrs': target,
                'clean_cidrs_found': 0,
                'saved_cidrs': [],
                'detailed_results': []
            }
    
    with open(args.report, 'w') as f:
        json.dump(report, f, indent=2)
    
    # Final Summary
    if not args.quiet:
        print(f"\n" + "=" * 60)
        print(f"🎉 FINAL SUMMARY")
        print(f"=" * 60)
        print(f"📅 Completed: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC")
        print(f"� Target: {total_cidrs} CIDRs, Found: {len(all_clean_cidrs)} CIDRs")
        print(f"🌍 Countries processed: {len(countries)}")
        print(f"✅ Countries with results: {len(country_results)}")
        
        if country_results:
            print(f"\n🏆 Results by Country:")
            for i, country in enumerate(countries):
                target = cidrs_per_country + (1 if i < remaining_cidrs else 0)
                if country in country_results:
                    found = len(country_results[country])
                    status = "✅" if found >= target else "⚠️"
                    print(f"   {country}: {found}/{target} CIDRs {status}")
                    for r in country_results[country][:3]:  # Show first 3
                        print(f"      {r['cidr']} (AS{r['asn']}, score: {r['score']:.1f})")
                    if len(country_results[country]) > 3:
                        print(f"      ... and {len(country_results[country]) - 3} more")
                else:
                    print(f"   {country}: 0/{target} CIDRs ❌")
        else:
            print(f"\n❌ No suitable CIDRs found for any country!")
        
        print(f"\n📁 Files generated:")
        print(f"   📄 {args.output} - Clean CIDR ranges (CIDRs only)")
        print(f"   📄 {args.report} - Detailed JSON report (with metadata)")
    else:
        # Quiet mode - just print essential info
        success_rate = (len(all_clean_cidrs) / total_cidrs * 100) if total_cidrs > 0 else 0
        print(f"Found {len(all_clean_cidrs)}/{total_cidrs} CIDRs ({success_rate:.1f}%) from {len(countries)} countries")
        print(f"Generated: {args.output}, {args.report}")

if __name__ == "__main__":
    random.seed(int(time.time()))
    main()
