import streamlit as st
import Service as svc
import pandas as pd
import numpy as np

# app config
st.set_page_config(page_title='Schrony Wrocław', layout = 'wide', initial_sidebar_state = 'auto')

# variables
existing_shelters = svc.load_existing_shelters_data()

# view
st.title("Schrony-Wrocław")

col1, col2 = st.columns(2)

with col1:
    st.header("Parametry procesu")
    st.write("Procent pokrycia")

with col2:
    st.header("Mapa podglądowa")
    st.map(data=existing_shelters, latitude="y", longitude="x", color="#0000FF", size=50)

